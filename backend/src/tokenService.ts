import { google } from 'googleapis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32c';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:4000/auth/google/callback';

// Validate required env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Supabase admin client (bypasses RLS)
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Google OAuth2 client
export const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// Scopes for Google Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// Encryption helpers
function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Generate OAuth URL
export function getAuthUrl(state: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required for refresh token
    scope: SCOPES,
    prompt: 'consent', // Force consent to always get refresh token
    state,
  });
}

// Exchange auth code for tokens
export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Get user info from Google
export async function getGoogleUserInfo(accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data;
}

// Store tokens in database
export async function storeTokens(
  userId: string,
  refreshToken: string,
  accessToken: string,
  expiryDate: number | null,
  googleEmail: string
) {
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
export async function getStoredTokens(userId: string) {
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
export async function refreshAccessToken(userId: string): Promise<string | null> {
  const tokens = await getStoredTokens(userId);
  
  if (!tokens || !tokens.refreshToken) {
    return null;
  }

  try {
    oauth2Client.setCredentials({
      refresh_token: tokens.refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    
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
  } catch (error) {
    console.error('Error refreshing token:', error);
    // If refresh fails, the token might be revoked - delete it
    await deleteTokens(userId);
    return null;
  }
}

// Get valid access token (refresh if needed)
export async function getValidAccessToken(userId: string): Promise<string | null> {
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
export async function deleteTokens(userId: string) {
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
export async function hasGoogleConnection(userId: string): Promise<boolean> {
  const tokens = await getStoredTokens(userId);
  return tokens !== null && tokens.refreshToken !== null;
}

