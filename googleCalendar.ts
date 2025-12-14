// Google Calendar Integration Service
// Uses Google Identity Services (GIS) for OAuth and Google Calendar API

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
// Full calendar scope needed to create secondary calendars
const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const ASCEND_CALENDAR_NAME = 'Ascend';

// Google Calendar color IDs mapping
// See: https://developers.google.com/calendar/api/v3/reference/colors
const TAG_COLOR_MAP: Record<string, string> = {
  work: '9',       // Bold Blue
  personal: '10',  // Bold Green
  meeting: '11',   // Bold Red
  task: '7',       // Peacock (Cyan)
  focus: '5',      // Banana (Yellow)
  break: '2',      // Sage (Light Green)
  urgent: '4',     // Flamingo (Pink)
  later: '8',      // Graphite (Gray)
  google: '1',     // Lavender (for synced Google events)
  demo: '3',       // Grape (Purple)
  move: '6',       // Tangerine (Orange)
};

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  colorId?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: number; // Hour in decimal (e.g., 9.5 = 9:30 AM)
  duration: number; // Duration in hours
  isGoogle: boolean;
  isFromAscendCalendar?: boolean;
  colorId?: string;
}

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gapiInited = false;
let gisInited = false;
let accessToken: string | null = null;
let ascendCalendarId: string | null = null;

// LocalStorage keys
const STORAGE_KEY_TOKEN = 'ascend_google_token';
const STORAGE_KEY_TOKEN_EXPIRY = 'ascend_google_token_expiry';
const STORAGE_KEY_CALENDAR_ID = 'ascend_calendar_id';
const STORAGE_KEY_USER = 'ascend_google_user';

// Token expiry buffer (refresh 5 minutes before expiry)
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes in ms

// Load saved token from localStorage
function loadSavedToken(): void {
  try {
    const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    const savedCalendarId = localStorage.getItem(STORAGE_KEY_CALENDAR_ID);
    const savedExpiry = localStorage.getItem(STORAGE_KEY_TOKEN_EXPIRY);
    
    // Check if token is still valid
    if (savedToken && savedExpiry) {
      const expiryTime = parseInt(savedExpiry, 10);
      if (Date.now() < expiryTime - TOKEN_EXPIRY_BUFFER) {
        accessToken = savedToken;
        console.log('Loaded saved Google token (valid)');
      } else {
        console.log('Saved token expired, will need refresh');
        // Clear expired token
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRY);
      }
    }
    
    if (savedCalendarId) {
      ascendCalendarId = savedCalendarId;
      console.log('Loaded saved Ascend calendar ID');
    }
  } catch (error) {
    console.error('Error loading saved token:', error);
  }
}

// Save token to localStorage with expiry
function saveToken(token: string, expiresIn: number): void {
  try {
    const expiryTime = Date.now() + (expiresIn * 1000);
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_TOKEN_EXPIRY, expiryTime.toString());
  } catch (error) {
    console.error('Error saving token:', error);
  }
}

// Check if token is expired or about to expire
function isTokenExpired(): boolean {
  try {
    const savedExpiry = localStorage.getItem(STORAGE_KEY_TOKEN_EXPIRY);
    if (!savedExpiry) return true;
    
    const expiryTime = parseInt(savedExpiry, 10);
    return Date.now() >= expiryTime - TOKEN_EXPIRY_BUFFER;
  } catch {
    return true;
  }
}

// Silent token refresh
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function silentRefreshToken(): Promise<boolean> {
  if (!tokenClient) {
    console.error('Token client not initialized');
    return false;
  }

  // Avoid multiple simultaneous refresh attempts
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = new Promise((resolve) => {
    try {
      console.log('Attempting silent token refresh...');
      
      // Store original callback
      const originalCallback = tokenClient!.requestAccessToken;
      
      // Request new token without prompt (silent refresh)
      tokenClient!.requestAccessToken({ prompt: '' });
      
      // The callback in initGoogleIdentity will handle the new token
      // We'll resolve after a timeout or when token is updated
      const checkInterval = setInterval(() => {
        if (accessToken && !isTokenExpired()) {
          clearInterval(checkInterval);
          isRefreshing = false;
          refreshPromise = null;
          console.log('Silent token refresh successful');
          resolve(true);
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        isRefreshing = false;
        refreshPromise = null;
        if (isTokenExpired()) {
          console.log('Silent token refresh failed or timed out');
          resolve(false);
        } else {
          resolve(true);
        }
      }, 10000);
    } catch (error) {
      console.error('Error during silent refresh:', error);
      isRefreshing = false;
      refreshPromise = null;
      resolve(false);
    }
  });

  return refreshPromise;
}

// Ensure valid token before API calls
export async function ensureValidToken(): Promise<boolean> {
  if (!accessToken) {
    return false;
  }
  
  if (!isTokenExpired()) {
    return true;
  }
  
  // Try silent refresh
  return await silentRefreshToken();
}

// Save calendar ID to localStorage
function saveCalendarId(calendarId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_CALENDAR_ID, calendarId);
  } catch (error) {
    console.error('Error saving calendar ID:', error);
  }
}

// Save user info to localStorage
export function saveGoogleUser(user: { email: string; name: string; picture: string }): void {
  try {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user:', error);
  }
}

// Load saved user from localStorage
export function loadSavedGoogleUser(): { email: string; name: string; picture: string } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading saved user:', error);
  }
  return null;
}

// Clear all saved data
function clearSavedData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRY);
    localStorage.removeItem(STORAGE_KEY_CALENDAR_ID);
    localStorage.removeItem(STORAGE_KEY_USER);
  } catch (error) {
    console.error('Error clearing saved data:', error);
  }
}

// Initialize the Google API client
export async function initGoogleApi(): Promise<void> {
  // Load any saved token first
  loadSavedToken();
  
  return new Promise((resolve, reject) => {
    if (typeof gapi === 'undefined') {
      reject(new Error('Google API not loaded'));
      return;
    }

    gapi.load('client', async () => {
      try {
        await gapi.client.init({
          discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        maybeEnableButtons();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Initialize Google Identity Services
export function initGoogleIdentity(onTokenReceived: (token: string) => void): void {
  if (typeof google === 'undefined' || !google.accounts) {
    console.error('Google Identity Services not loaded');
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: async (response) => {
      if (response.error !== undefined) {
        console.error('Token error:', response.error);
        return;
      }
      accessToken = response.access_token;
      // Save token with expiry (expires_in is in seconds)
      saveToken(response.access_token, response.expires_in || 3600);
      
      // Find or create Ascend calendar
      try {
        await findOrCreateAscendCalendar();
      } catch (error) {
        console.error('Failed to setup Ascend calendar:', error);
      }
      
      onTokenReceived(response.access_token);
    },
  });
  gisInited = true;
  maybeEnableButtons();
}

function maybeEnableButtons(): void {
  // Both APIs are loaded
  if (gapiInited && gisInited) {
    console.log('Google APIs ready');
  }
}

// Find or create the Ascend calendar
async function findOrCreateAscendCalendar(): Promise<string> {
  if (!accessToken) {
    throw new Error('Not signed in to Google');
  }

  try {
    // First, try to find existing Ascend calendar
    const listResponse = await gapi.client.calendar.calendarList.list();
    const calendars = listResponse.result.items || [];
    
    const existingCalendar = calendars.find(
      (cal: any) => cal.summary === ASCEND_CALENDAR_NAME
    );

    if (existingCalendar) {
      console.log('Found existing Ascend calendar:', existingCalendar.id);
      ascendCalendarId = existingCalendar.id;
      saveCalendarId(existingCalendar.id);
      return existingCalendar.id;
    }

    // Create new Ascend calendar
    console.log('Creating new Ascend calendar...');
    const createResponse = await gapi.client.calendar.calendars.insert({
      resource: {
        summary: ASCEND_CALENDAR_NAME,
        description: 'Tasks and timeboxes from Ascend - Your productivity workspace',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });

    const newCalendarId = createResponse.result.id;
    console.log('Created Ascend calendar:', newCalendarId);

    // Set calendar color (purple to match Ascend branding)
    try {
      await gapi.client.calendar.calendarList.patch({
        calendarId: newCalendarId,
        resource: {
          backgroundColor: '#7C3AED', // Purple
          foregroundColor: '#FFFFFF',
        },
      });
    } catch (colorError) {
      console.log('Could not set calendar color (non-critical):', colorError);
    }

    ascendCalendarId = newCalendarId;
    saveCalendarId(newCalendarId);
    return newCalendarId;
  } catch (error) {
    console.error('Error finding/creating Ascend calendar:', error);
    throw error;
  }
}

// Get Ascend calendar ID (creates if needed)
export async function getAscendCalendarId(): Promise<string> {
  // If we have a cached ID, verify it's still valid
  if (ascendCalendarId) {
    try {
      // Quick check if calendar still exists
      const listResponse = await gapi.client.calendar.calendarList.list();
      const calendars = listResponse.result.items || [];
      const exists = calendars.some((cal: any) => cal.id === ascendCalendarId);
      
      if (exists) {
        return ascendCalendarId;
      } else {
        console.log('Cached Ascend calendar ID is invalid, recreating...');
        ascendCalendarId = null;
        localStorage.removeItem(STORAGE_KEY_CALENDAR_ID);
      }
    } catch (error) {
      console.error('Error validating calendar ID:', error);
      // Clear invalid ID and recreate
      ascendCalendarId = null;
      localStorage.removeItem(STORAGE_KEY_CALENDAR_ID);
    }
  }
  return await findOrCreateAscendCalendar();
}

// Request access token (triggers OAuth popup)
export function requestAccessToken(): void {
  if (!tokenClient) {
    console.error('Token client not initialized');
    alert('Google API not ready. Please refresh the page and try again.');
    return;
  }

  try {
    if (accessToken === null) {
      // First time - prompt for consent
      console.log('Requesting Google OAuth token with consent...');
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      // Already have token, just request without prompt
      console.log('Requesting Google OAuth token (refresh)...');
      tokenClient.requestAccessToken({ prompt: '' });
    }
  } catch (error) {
    console.error('Error requesting access token:', error);
    alert('Failed to open Google sign-in. Please check if popups are blocked.');
  }
}

// Revoke access token (sign out)
export function revokeAccessToken(): void {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {
      console.log('Access token revoked');
      accessToken = null;
      ascendCalendarId = null;
      clearSavedData();
    });
  } else {
    // Clear saved data even if no token in memory
    clearSavedData();
  }
}

// Check if user is signed in
export function isSignedIn(): boolean {
  return accessToken !== null;
}

// Get current access token
export function getAccessToken(): string | null {
  return accessToken;
}

// Set access token (e.g., from localStorage)
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

// Fetch events from Google Calendar
export async function fetchGoogleCalendarEvents(
  timeMin: Date,
  timeMax: Date,
  includeAscendCalendar: boolean = true,
  includePrimaryCalendar: boolean = false
): Promise<CalendarEvent[]> {
  if (!accessToken) {
    throw new Error('Not signed in to Google');
  }

  // Ensure token is valid
  const isValid = await ensureValidToken();
  if (!isValid) {
    throw new Error('Google token expired. Please reconnect Google Calendar.');
  }

  const allEvents: CalendarEvent[] = [];

  try {
    // Fetch from Ascend calendar
    if (includeAscendCalendar && ascendCalendarId) {
      try {
        const ascendResponse = await gapi.client.calendar.events.list({
          calendarId: ascendCalendarId,
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        });

        const ascendEvents: GoogleCalendarEvent[] = ascendResponse.result.items || [];
        allEvents.push(...ascendEvents
          .filter(event => event.start?.dateTime)
          .map(event => mapGoogleEventToCalendarEvent(event, true))
        );
      } catch (error) {
        console.error('Error fetching Ascend calendar events:', error);
      }
    }

    // Fetch from primary calendar
    if (includePrimaryCalendar) {
      try {
        const primaryResponse = await gapi.client.calendar.events.list({
          calendarId: 'primary',
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        });

        const primaryEvents: GoogleCalendarEvent[] = primaryResponse.result.items || [];
        allEvents.push(...primaryEvents
          .filter(event => event.start?.dateTime)
          .map(event => mapGoogleEventToCalendarEvent(event, false))
        );
      } catch (error) {
        console.error('Error fetching primary calendar events:', error);
      }
    }

    return allEvents;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

// Helper function to map Google event to CalendarEvent
function mapGoogleEventToCalendarEvent(event: GoogleCalendarEvent, isFromAscend: boolean): CalendarEvent {
  const startDate = new Date(event.start.dateTime!);
  const endDate = new Date(event.end.dateTime || event.start.dateTime!);
  
  const startHour = startDate.getHours() + startDate.getMinutes() / 60;
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

  return {
    id: event.id,
    title: event.summary || 'Untitled',
    start: startHour,
    duration: Math.max(0.25, durationHours),
    isGoogle: true,
    isFromAscendCalendar: isFromAscend,
  };
}

// Create an event in the Ascend calendar
export async function createGoogleCalendarEvent(
  title: string,
  startHour: number,
  durationHours: number,
  date: Date = new Date(),
  tag?: string
): Promise<string> {
  if (!accessToken) {
    throw new Error('Not signed in to Google');
  }

  // Ensure token is valid (refresh if needed)
  const isValid = await ensureValidToken();
  if (!isValid) {
    throw new Error('Google token expired. Please reconnect Google Calendar.');
  }

  // Get or create Ascend calendar
  const calendarId = await getAscendCalendarId();

  // Create start and end times
  const startDate = new Date(date);
  startDate.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setTime(startDate.getTime() + durationHours * 60 * 60 * 1000);

  // Get color ID based on tag
  const colorId = tag ? (TAG_COLOR_MAP[tag.toLowerCase()] || '9') : '9';

  try {
    const response = await gapi.client.calendar.events.insert({
      calendarId: calendarId,
      resource: {
        summary: title,
        colorId: colorId,
        description: tag ? `Tag: ${tag}` : undefined,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    });

    console.log('Created event in Ascend calendar:', response.result.id, 'with color:', colorId);
    return response.result.id;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

// Delete an event from the Ascend calendar
export async function deleteGoogleCalendarEvent(eventId: string): Promise<void> {
  if (!accessToken) {
    throw new Error('Not signed in to Google');
  }

  // Ensure token is valid (refresh if needed)
  const isValid = await ensureValidToken();
  if (!isValid) {
    throw new Error('Google token expired. Please reconnect Google Calendar.');
  }

  const calendarId = await getAscendCalendarId();

  try {
    await gapi.client.calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

// Update an event in the Ascend calendar
export async function updateGoogleCalendarEvent(
  eventId: string,
  title: string,
  startHour: number,
  durationHours: number,
  date: Date = new Date()
): Promise<void> {
  if (!accessToken) {
    throw new Error('Not signed in to Google');
  }

  // Ensure token is valid (refresh if needed)
  const isValid = await ensureValidToken();
  if (!isValid) {
    throw new Error('Google token expired. Please reconnect Google Calendar.');
  }

  const calendarId = await getAscendCalendarId();

  const startDate = new Date(date);
  startDate.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setTime(startDate.getTime() + durationHours * 60 * 60 * 1000);

  try {
    await gapi.client.calendar.events.update({
      calendarId: calendarId,
      eventId: eventId,
      resource: {
        summary: title,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

// Get user info from Google
export async function getGoogleUserInfo(): Promise<{ email: string; name: string; picture: string } | null> {
  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const data = await response.json();
    return {
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
}

// Two-way sync interface
export interface SyncResult {
  toAdd: CalendarEvent[];
  toUpdate: Array<{ localId: string | number; event: CalendarEvent }>;
  toRemove: string[];
  stats: {
    added: number;
    updated: number;
    removed: number;
  };
}

// Two-way sync: Compare local blocks with Google events
export async function syncCalendarEvents(
  localBlocks: Array<{
    id: string | number;
    title: string;
    start: number;
    duration: number;
    googleEventId?: string;
  }>,
  date: Date = new Date()
): Promise<SyncResult> {
  if (!accessToken) {
    throw new Error('Not signed in to Google');
  }

  // Ensure token is valid
  const isValid = await ensureValidToken();
  if (!isValid) {
    throw new Error('Google token expired. Please reconnect Google Calendar.');
  }

  // Get start and end of the specified day
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

  // Fetch events from Ascend calendar
  const googleEvents = await fetchGoogleCalendarEvents(startOfDay, endOfDay, true, false);

  const toAdd: CalendarEvent[] = [];
  const toUpdate: Array<{ localId: string | number; event: CalendarEvent }> = [];
  const toRemove: string[] = [];

  // Create a map of local blocks by their Google event ID
  const localBlocksByGoogleId = new Map<string, typeof localBlocks[0]>();
  localBlocks.forEach(block => {
    if (block.googleEventId) {
      localBlocksByGoogleId.set(block.googleEventId, block);
    }
  });

  // Create a set of Google event IDs
  const googleEventIds = new Set(googleEvents.map(e => e.id));

  // Check for new or updated events from Google
  for (const googleEvent of googleEvents) {
    const localBlock = localBlocksByGoogleId.get(googleEvent.id);
    
    if (!localBlock) {
      // New event from Google - add it locally
      toAdd.push(googleEvent);
    } else {
      // Event exists locally - check if it was updated in Google
      const hasChanged = 
        localBlock.title !== googleEvent.title ||
        Math.abs(localBlock.start - googleEvent.start) > 0.01 ||
        Math.abs(localBlock.duration - googleEvent.duration) > 0.01;
      
      if (hasChanged) {
        toUpdate.push({ localId: localBlock.id, event: googleEvent });
      }
    }
  }

  // Check for events deleted from Google
  for (const localBlock of localBlocks) {
    if (localBlock.googleEventId && !googleEventIds.has(localBlock.googleEventId)) {
      // This event was deleted from Google - remove it locally
      toRemove.push(String(localBlock.id));
    }
  }

  return {
    toAdd,
    toUpdate,
    toRemove,
    stats: {
      added: toAdd.length,
      updated: toUpdate.length,
      removed: toRemove.length,
    },
  };
}

// Type declarations for Google APIs
declare global {
  interface Window {
    gapi: typeof gapi;
    google: typeof google;
  }
}
