"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const tokenService_1 = require("./tokenService");
// Load environment variables
dotenv_1.default.config();
const router = (0, express_1.Router)();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
// Middleware to verify Supabase JWT and get user
async function authenticateUser(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        });
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
}
// Start OAuth flow - redirects to Google
router.get('/google', (req, res) => {
    const { userId, returnUrl } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }
    // Encode state with userId and optional return URL
    const state = Buffer.from(JSON.stringify({
        userId,
        returnUrl: returnUrl || FRONTEND_URL,
    })).toString('base64');
    const authUrl = (0, tokenService_1.getAuthUrl)(state);
    res.redirect(authUrl);
});
// OAuth callback - receives auth code from Google
router.get('/google/callback', async (req, res) => {
    const { code, state, error } = req.query;
    if (error) {
        console.error('OAuth error:', error);
        return res.redirect(`${FRONTEND_URL}?google_error=${error}`);
    }
    if (!code || !state) {
        return res.redirect(`${FRONTEND_URL}?google_error=missing_params`);
    }
    try {
        // Decode state
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        const { userId, returnUrl } = stateData;
        if (!userId) {
            throw new Error('Missing userId in state');
        }
        // Exchange code for tokens
        const tokens = await (0, tokenService_1.exchangeCodeForTokens)(code);
        if (!tokens.refresh_token) {
            console.error('No refresh token received - user may have previously authorized without revoking');
            // This can happen if user already authorized but didn't revoke
            // We should still try to use what we have
        }
        if (!tokens.access_token) {
            throw new Error('No access token received');
        }
        // Get user info from Google
        const userInfo = await (0, tokenService_1.getGoogleUserInfo)(tokens.access_token);
        // Store tokens
        await (0, tokenService_1.storeTokens)(userId, tokens.refresh_token || '', // May be empty if already authorized
        tokens.access_token, tokens.expiry_date || null, userInfo.email || '');
        // Redirect back to frontend with success
        const redirectUrl = new URL(returnUrl || FRONTEND_URL);
        redirectUrl.searchParams.set('google_connected', 'true');
        redirectUrl.searchParams.set('google_email', userInfo.email || '');
        res.redirect(redirectUrl.toString());
    }
    catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect(`${FRONTEND_URL}?google_error=callback_failed`);
    }
});
// Check Google connection status
router.get('/google/status', authenticateUser, async (req, res) => {
    try {
        const user = req.user;
        const isConnected = await (0, tokenService_1.hasGoogleConnection)(user.id);
        if (isConnected) {
            const tokens = await (0, tokenService_1.getStoredTokens)(user.id);
            return res.json({
                connected: true,
                email: tokens?.googleEmail || null,
            });
        }
        return res.json({ connected: false });
    }
    catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to check status' });
    }
});
// Get valid access token (auto-refreshes if needed)
router.get('/google/token', authenticateUser, async (req, res) => {
    try {
        const user = req.user;
        const accessToken = await (0, tokenService_1.getValidAccessToken)(user.id);
        if (!accessToken) {
            return res.status(404).json({
                error: 'No Google connection found',
                needsReauth: true,
            });
        }
        res.json({ accessToken });
    }
    catch (error) {
        console.error('Token fetch error:', error);
        res.status(500).json({ error: 'Failed to get token' });
    }
});
// Disconnect Google account
router.post('/google/disconnect', authenticateUser, async (req, res) => {
    try {
        const user = req.user;
        await (0, tokenService_1.deleteTokens)(user.id);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({ error: 'Failed to disconnect' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map