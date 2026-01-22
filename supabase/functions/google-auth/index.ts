import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { google } from "npm:googleapis@129.0.0";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Encryption helpers (Ported from Node.js backend)
function encrypt(text: string, encryptionKey: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string, encryptionKey: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const path = url.pathname.split('/').pop(); // "google-auth" is the function name, we want subpaths if any logic requires it, but easiest is to use query params or inspect `req.url`

        // We'll use a specific action param to differentiate routes or just check the last part of the path
        // Supabase routing: /functions/v1/google-auth
        // We can simulate routes by checking url.searchParams.get('route') or similar, OR parsing the URL.
        // Let's use url.pathname matching.
        const pathParts = url.pathname.split('/');
        // Expected: ["", "functions", "v1", "google-auth", "ACTION"]
        // Or just ["", "functions", "v1", "google-auth"]

        // Simplification: We will dispatch based on the last segment if it's not "google-auth", 
        // or use a query parameter `action` to keep it robust against deployment paths.
        // Actually, clean URL path routing is better.

        // Let's determine the action.
        let action = 'index';
        if (url.pathname.endsWith('/callback')) action = 'callback';
        else if (url.pathname.endsWith('/status')) action = 'status';
        else if (url.pathname.endsWith('/token')) action = 'token';
        else if (url.pathname.endsWith('/disconnect')) action = 'disconnect';
        else if (url.pathname.endsWith('/google')) action = 'login'; // Initial redirect

        console.log(`Handling action: ${action} for ${url.pathname}`);

        // Env Vars
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
        const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''; // For admin access to tokens
        const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
        const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
        const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') ?? 'default-key-change-in-production-32c';
        const REDIRECT_URI = 'https://hmnbdkwjgmwchuyhtmqh.supabase.co/functions/v1/google-auth/callback';
        const FRONTEND_URL = 'https://www.ascendtimebox.com'; // Default/fallback

        const ALLOWED_RETURN_ORIGINS = new Set([
            FRONTEND_URL,
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ]);

        const isAllowedReturnOrigin = (origin: string): boolean => {
            if (ALLOWED_RETURN_ORIGINS.has(origin)) return true;

            // Allow common LAN dev origin on the same Vite port
            // (keeps this fairly tight while still working on phones on the same network)
            if (origin.startsWith('http://192.168.') && origin.endsWith(':5173')) return true;

            return false;
        };

        const sanitizeReturnUrl = (candidate: string | null): string => {
            if (!candidate) return FRONTEND_URL;
            try {
                const u = new URL(candidate);
                if (!isAllowedReturnOrigin(u.origin)) return FRONTEND_URL;
                return u.toString();
            } catch {
                return FRONTEND_URL;
            }
        };

        // Validate Env
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
            throw new Error('Missing Google OAuth configuration');
        }

        // Initialize Clients
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const oauth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            REDIRECT_URI
        );

        // --- ROUTE: LOGIN (Redirect to Google) ---
        if (action === 'login') {
            const userId = url.searchParams.get('userId');
            if (!userId) throw new Error('userId is required');

            const requestedReturnUrl = url.searchParams.get('returnUrl');
            const safeReturnUrl = sanitizeReturnUrl(requestedReturnUrl);

            const scopes = [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events',
                'https://www.googleapis.com/auth/calendar.readonly',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile',
            ];

            const state = btoa(JSON.stringify({ userId, returnUrl: safeReturnUrl }));

            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: scopes,
                prompt: 'consent',
                state: state,
            });

            // Returning 302 Redirect so the browser goes directly to Google
            // This is better for a direct link click.
            // Note: original backend did server-side redirect. 
            // Here we can return the URL for frontend to redirect, or 302 directly.
            // Let's do 302 directly to match previous behavior if link is clicked directly, 
            // BUT typical SPA flow might prefer getting the URL. 
            // The original code: `res.redirect(authUrl)` -> 302.
            // Let's support 302.
            return Response.redirect(authUrl);
        }

        // --- ROUTE: CALLBACK (Exchange Code) ---
        if (action === 'callback') {
            const code = url.searchParams.get('code');
            const state = url.searchParams.get('state');
            const error = url.searchParams.get('error');

            let safeReturnUrl = FRONTEND_URL;
            if (state) {
                try {
                    const stateData = JSON.parse(atob(state));
                    safeReturnUrl = sanitizeReturnUrl(stateData?.returnUrl ?? null);
                } catch {
                    // ignore
                }
            }

            if (error) {
                return Response.redirect(`${safeReturnUrl}?google_error=${error}`);
            }
            if (!code || !state) {
                return Response.redirect(`${safeReturnUrl}?google_error=missing_params`);
            }

            // Decode state
            const stateData = JSON.parse(atob(state));
            const { userId } = stateData;
            const returnUrl = sanitizeReturnUrl(stateData?.returnUrl ?? null);

            // Exchange code
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            // Get User Info for email
            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
            const { data: userInfo } = await oauth2.userinfo.get();

            // Store Tokens
            const encryptedRefreshToken = tokens.refresh_token
                ? encrypt(tokens.refresh_token, ENCRYPTION_KEY)
                : undefined;

            // Update logic: if verify logic existed in previous backend, we trust it here.
            // We use upsert.
            const upsertData: any = {
                user_id: userId,
                access_token: tokens.access_token,
                token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
                google_email: userInfo.email,
                updated_at: new Date().toISOString(),
            };

            // Only update refresh token if we got a new one
            if (encryptedRefreshToken) {
                upsertData.refresh_token = encryptedRefreshToken;
            }

            const { error: dbError } = await supabaseAdmin
                .from('google_oauth_tokens')
                .upsert(upsertData, { onConflict: 'user_id' });

            if (dbError) throw dbError;

            // Success Redirect
            const finalRedirect = new URL(returnUrl || FRONTEND_URL);
            finalRedirect.searchParams.set('google_connected', 'true');
            finalRedirect.searchParams.set('google_email', userInfo.email || '');

            return Response.redirect(finalRedirect.toString());
        }

        // --- MIDDLEWARE: AUTH (for Status, Token, Disconnect) ---
        // All subsequent routes require the user to be JWT authenticated with Supabase
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: corsHeaders });
        }

        const token = authHeader.replace('Bearer ', '');
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({
                error: 'Invalid token',
                details: authError?.message || 'No user found',
                hint: 'Check if token is expired or project keys mismatch'
            }), { status: 401, headers: corsHeaders });
        }
        const userId = user.id;

        // --- ROUTE: STATUS ---
        if (action === 'status') {
            const { data, error } = await supabaseAdmin
                .from('google_oauth_tokens')
                .select('*')
                .eq('user_id', userId)
                .single();

            const isConnected = !!data && !!data.access_token;

            return new Response(JSON.stringify({
                connected: isConnected,
                email: data?.google_email || null
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // --- ROUTE: TOKEN (Get/Refresh Access Token) ---
        if (action === 'token') {
            const { data, error } = await supabaseAdmin
                .from('google_oauth_tokens')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (!data) {
                return new Response(JSON.stringify({ error: 'No connection found', needsReauth: true }), { status: 404, headers: corsHeaders });
            }

            // Check expiry (5 min buffer)
            const now = new Date();
            const expiry = data.token_expiry ? new Date(data.token_expiry) : new Date(0);
            const isExpired = expiry.getTime() - (5 * 60 * 1000) < now.getTime();

            if (!isExpired) {
                return new Response(JSON.stringify({ accessToken: data.access_token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // Needs Refresh
            const refreshToken = decrypt(data.refresh_token, ENCRYPTION_KEY);
            oauth2Client.setCredentials({ refresh_token: refreshToken });

            try {
                const { credentials } = await oauth2Client.refreshAccessToken();

                // Update DB
                await supabaseAdmin
                    .from('google_oauth_tokens')
                    .update({
                        access_token: credentials.access_token,
                        token_expiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);

                return new Response(JSON.stringify({ accessToken: credentials.access_token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

            } catch (err) {
                console.error('Refresh failed', err);
                // Token likely revoked
                await supabaseAdmin.from('google_oauth_tokens').delete().eq('user_id', userId);
                return new Response(JSON.stringify({ error: 'Token refresh failed', needsReauth: true }), { status: 401, headers: corsHeaders });
            }
        }

        // --- ROUTE: DISCONNECT ---
        if (action === 'disconnect') {
            await supabaseAdmin.from('google_oauth_tokens').delete().eq('user_id', userId);
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response('Not Found', { status: 404, headers: corsHeaders });

    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
