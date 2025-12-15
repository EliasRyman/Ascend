"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.oauth2Client = void 0;
exports.getAuthUrl = getAuthUrl;
exports.exchangeCodeForTokens = exchangeCodeForTokens;
exports.getGoogleUserInfo = getGoogleUserInfo;
exports.storeTokens = storeTokens;
exports.getStoredTokens = getStoredTokens;
exports.refreshAccessToken = refreshAccessToken;
exports.getValidAccessToken = getValidAccessToken;
exports.deleteTokens = deleteTokens;
exports.hasGoogleConnection = hasGoogleConnection;
const googleapis_1 = require("googleapis");
const supabase_js_1 = require("@supabase/supabase-js");
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32c';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:4000/auth/google/callback';
// Validate required env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}
// Supabase admin client (bypasses RLS)
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_KEY);
// Google OAuth2 client
exports.oauth2Client = new googleapis_1.google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
// Scopes for Google Calendar
const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
];
// Encryption helpers
function encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto_1.default.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}
function decrypt(encryptedText) {
    const algorithm = 'aes-256-cbc';
    const key = crypto_1.default.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto_1.default.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
// Generate OAuth URL
function getAuthUrl(state) {
    return exports.oauth2Client.generateAuthUrl({
        access_type: 'offline', // Required for refresh token
        scope: SCOPES,
        prompt: 'consent', // Force consent to always get refresh token
        state,
    });
}
// Exchange auth code for tokens
async function exchangeCodeForTokens(code) {
    const { tokens } = await exports.oauth2Client.getToken(code);
    return tokens;
}
// Get user info from Google
async function getGoogleUserInfo(accessToken) {
    exports.oauth2Client.setCredentials({ access_token: accessToken });
    const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: exports.oauth2Client });
    const { data } = await oauth2.userinfo.get();
    return data;
}
// Store tokens in database
async function storeTokens(userId, refreshToken, accessToken, expiryDate, googleEmail) {
    const encryptedRefreshToken = encrypt(refreshToken);
    const { error } = await supabase
        .from('google_oauth_tokens')
        .upsert({
        user_id: userId,
        refresh_token: encryptedRefreshToken,
        access_token: accessToken,
        token_expiry: expiryDate ? new Date(expiryDate).toISOString() : null,
        google_email: googleEmail,
        updated_at: new Date().toISOString(),
    }, {
        onConflict: 'user_id',
    });
    if (error) {
        console.error('Error storing tokens:', error);
        throw error;
    }
}
// Get stored tokens for user
async function getStoredTokens(userId) {
    const { data, error } = await supabase
        .from('google_oauth_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error || !data) {
        return null;
    }
    return {
        refreshToken: decrypt(data.refresh_token),
        accessToken: data.access_token,
        tokenExpiry: data.token_expiry ? new Date(data.token_expiry) : null,
        googleEmail: data.google_email,
    };
}
// Refresh access token using stored refresh token
async function refreshAccessToken(userId) {
    const tokens = await getStoredTokens(userId);
    if (!tokens || !tokens.refreshToken) {
        return null;
    }
    try {
        exports.oauth2Client.setCredentials({
            refresh_token: tokens.refreshToken,
        });
        const { credentials } = await exports.oauth2Client.refreshAccessToken();
        if (!credentials.access_token) {
            throw new Error('No access token received');
        }
        // Update stored access token
        const { error } = await supabase
            .from('google_oauth_tokens')
            .update({
            access_token: credentials.access_token,
            token_expiry: credentials.expiry_date
                ? new Date(credentials.expiry_date).toISOString()
                : null,
            updated_at: new Date().toISOString(),
        })
            .eq('user_id', userId);
        if (error) {
            console.error('Error updating access token:', error);
        }
        return credentials.access_token;
    }
    catch (error) {
        console.error('Error refreshing token:', error);
        // If refresh fails, the token might be revoked - delete it
        await deleteTokens(userId);
        return null;
    }
}
// Get valid access token (refresh if needed)
async function getValidAccessToken(userId) {
    const tokens = await getStoredTokens(userId);
    if (!tokens) {
        return null;
    }
    // Check if token is expired or about to expire (5 min buffer)
    const now = new Date();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    if (tokens.tokenExpiry && tokens.tokenExpiry.getTime() - expiryBuffer > now.getTime()) {
        // Token is still valid
        return tokens.accessToken;
    }
    // Token expired or about to expire - refresh it
    return await refreshAccessToken(userId);
}
// Delete stored tokens
async function deleteTokens(userId) {
    const { error } = await supabase
        .from('google_oauth_tokens')
        .delete()
        .eq('user_id', userId);
    if (error) {
        console.error('Error deleting tokens:', error);
        throw error;
    }
}
// Check if user has Google connected
async function hasGoogleConnection(userId) {
    const tokens = await getStoredTokens(userId);
    return tokens !== null && tokens.refreshToken !== null;
}
//# sourceMappingURL=tokenService.js.map