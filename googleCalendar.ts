// Google Calendar Integration Service
// Uses Backend OAuth with Refresh Tokens for persistent connection

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const ASCEND_CALENDAR_NAME = 'Ascend';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

// Google Calendar color IDs mapping
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
  start: number;
  duration: number;
  isGoogle: boolean;
  isFromAscendCalendar?: boolean;
  colorId?: string;
  calendarName?: string;
  calendarColor?: string;
  calendarId?: string;
  canEdit?: boolean; // true if user has write access to this calendar
}

interface GoogleConnectionStatus {
  connected: boolean;
  email?: string | null;
}

// State
let accessToken: string | null = null;
let ascendCalendarId: string | null = null;
let gapiInited = false;
let supabaseToken: string | null = null;

// LocalStorage keys
const STORAGE_KEY_CALENDAR_ID = 'ascend_calendar_id';
const STORAGE_KEY_USER = 'ascend_google_user';

// Set Supabase auth token for backend requests
export function setSupabaseToken(token: string | null): void {
  supabaseToken = token;
}

// Helper function for backend API calls
async function backendFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (supabaseToken) {
    headers['Authorization'] = `Bearer ${supabaseToken}`;
  }

  return fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

// Check Google connection status via backend
export async function checkGoogleConnectionStatus(): Promise<GoogleConnectionStatus> {
  if (!supabaseToken) {
    return { connected: false };
  }

  try {
    const response = await backendFetch('/auth/google/status');
    if (!response.ok) {
      return { connected: false };
    }
    return await response.json();
  } catch (error) {
    console.error('Error checking Google connection status:', error);
    return { connected: false };
  }
}

// Get valid access token from backend (auto-refreshes if needed)
export async function getValidAccessToken(): Promise<string | null> {
  if (!supabaseToken) {
    return null;
  }

  try {
    const response = await backendFetch('/auth/google/token');
    if (!response.ok) {
      const data = await response.json();
      if (data.needsReauth) {
        console.log('Google connection needs re-authorization');
        return null;
      }
      throw new Error(data.error || 'Failed to get token');
    }
    
    const data = await response.json();
    accessToken = data.accessToken;
    return accessToken;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

// Ensure we have a valid token before API calls
async function ensureValidToken(): Promise<boolean> {
  const token = await getValidAccessToken();
  if (token) {
    // Ensure GAPI client is configured with the token
    if (typeof gapi !== 'undefined' && gapi.client) {
      gapi.client.setToken({ access_token: token });
    }
    return true;
  }
  return false;
}

// Start Google OAuth flow (redirects to backend)
export function startGoogleOAuth(userId: string): void {
  const returnUrl = encodeURIComponent(window.location.href);
  window.location.href = `${BACKEND_URL}/auth/google?userId=${userId}&returnUrl=${returnUrl}`;
}

// Disconnect Google account via backend
export async function disconnectGoogle(): Promise<boolean> {
  if (!supabaseToken) {
    return false;
  }

  try {
    const response = await backendFetch('/auth/google/disconnect', {
      method: 'POST',
    });
    
    if (response.ok) {
      accessToken = null;
      clearLocalData();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error disconnecting Google:', error);
    return false;
  }
}

// Clear local data (not backend tokens)
function clearLocalData(): void {
  localStorage.removeItem(STORAGE_KEY_CALENDAR_ID);
  localStorage.removeItem(STORAGE_KEY_USER);
  ascendCalendarId = null;
}

// Save user info to localStorage
export function saveGoogleUser(user: { email: string; name?: string; picture?: string }): void {
  try {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user:', error);
  }
}

// Load saved user from localStorage
export function loadSavedGoogleUser(): { email: string; name?: string; picture?: string } | null {
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

// Check if URL has Google OAuth callback params
export function handleGoogleOAuthCallback(): { connected: boolean; email?: string } | null {
  const params = new URLSearchParams(window.location.search);
  const googleConnected = params.get('google_connected');
  const googleEmail = params.get('google_email');
  const googleError = params.get('google_error');

  if (googleError) {
    console.error('Google OAuth error:', googleError);
    // Clear the params from URL
    window.history.replaceState({}, '', window.location.pathname);
    return null;
  }

  if (googleConnected === 'true') {
    // Clear the params from URL
    window.history.replaceState({}, '', window.location.pathname);
    
    if (googleEmail) {
      saveGoogleUser({ email: googleEmail });
    }
    
    return { connected: true, email: googleEmail || undefined };
  }

  return null;
}

// Initialize the Google API client
export async function initGoogleApi(): Promise<void> {
  // Load saved calendar ID
  const savedCalendarId = localStorage.getItem(STORAGE_KEY_CALENDAR_ID);
  if (savedCalendarId) {
    ascendCalendarId = savedCalendarId;
  }

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
        console.log('Google API client initialized');
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Check if user is signed in (has valid token)
export function isSignedIn(): boolean {
  return accessToken !== null;
}

// Get current access token
export function getAccessToken(): string | null {
  return accessToken;
}

// Set access token and configure GAPI client
export function setAccessToken(token: string | null): void {
  accessToken = token;
  // Configure GAPI client with the token for authenticated API calls
  if (token && typeof gapi !== 'undefined' && gapi.client) {
    gapi.client.setToken({ access_token: token });
    console.log('GAPI client token configured');
  }
}

// Save calendar ID to localStorage
function saveCalendarId(calendarId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_CALENDAR_ID, calendarId);
  } catch (error) {
    console.error('Error saving calendar ID:', error);
  }
}

// Find or create the Ascend calendar
async function findOrCreateAscendCalendar(): Promise<string> {
  if (!accessToken) {
    throw new Error('Not signed in to Google');
  }

  try {
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

    try {
      await gapi.client.calendar.calendarList.patch({
        calendarId: newCalendarId,
        resource: {
          backgroundColor: '#7C3AED',
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
  if (ascendCalendarId) {
    return ascendCalendarId;
  }
  return await findOrCreateAscendCalendar();
}

// Fetch events from Google Calendar
export async function fetchGoogleCalendarEvents(
  timeMin: Date,
  timeMax: Date,
  includeAscendCalendar: boolean = true,
  includeAllCalendars: boolean = true
): Promise<CalendarEvent[]> {
  const isValid = await ensureValidToken();
  if (!isValid) {
    throw new Error('Google token expired. Please reconnect Google Calendar.');
  }

  const allEvents: CalendarEvent[] = [];

  try {
    let calendars: any[] = [];
    
    if (includeAllCalendars) {
      try {
        console.log('Fetching calendar list...');
        const calendarListResponse = await gapi.client.calendar.calendarList.list();
        calendars = calendarListResponse.result.items || [];
        console.log('Found calendars:', calendars.map(c => ({ id: c.id, summary: c.summary })));
      } catch (listError: any) {
        const errorCode = listError?.status || listError?.result?.error?.code;
        if (errorCode === 401) {
          console.warn('Token expired (401). Please reconnect Google Calendar.');
          accessToken = null;
          throw new Error('SESSION_EXPIRED');
        }
        console.warn('Could not fetch calendar list:', listError);
        calendars = [{ id: 'primary', summary: 'Primary', backgroundColor: '#4285f4' }];
      }
    } else {
      calendars = [{ id: 'primary', summary: 'Primary', backgroundColor: '#4285f4' }];
    }
    
    for (const calendar of calendars) {
      if (includeAscendCalendar && calendar.id === ascendCalendarId) {
        continue;
      }
      
      if (calendar.accessRole === 'freeBusyReader') {
        continue;
      }

      // Check if user has write access to this calendar
      const canEditCalendar = calendar.accessRole === 'owner' || calendar.accessRole === 'writer';

      try {
        const response = await gapi.client.calendar.events.list({
          calendarId: calendar.id!,
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        });

        const events: GoogleCalendarEvent[] = response.result.items || [];
        const timedEvents = events.filter(event => event.start?.dateTime);
        allEvents.push(...timedEvents.map(event => mapGoogleEventToCalendarEvent(
          event, 
          false, 
          calendar.summary || 'Calendar',
          calendar.backgroundColor || '#4285f4',
          calendar.id!,
          canEditCalendar
        )));
      } catch (error) {
        console.error(`Error fetching events from calendar ${calendar.summary}:`, error);
      }
    }

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
          .map(event => mapGoogleEventToCalendarEvent(event, true, 'Ascend', '#7C3AED', ascendCalendarId, true)) // Ascend is always editable
        );
      } catch (error) {
        console.error('Error fetching Ascend calendar events:', error);
      }
    }

    return allEvents;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

function mapGoogleEventToCalendarEvent(
  event: GoogleCalendarEvent, 
  isFromAscend: boolean,
  calendarName: string = 'Calendar',
  calendarColor: string = '#4285f4',
  calendarId?: string,
  canEdit: boolean = false
): CalendarEvent {
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
    calendarName,
    calendarColor,
    calendarId,
    canEdit,
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
  const isValid = await ensureValidToken();
  if (!isValid) {
    throw new Error('Google token expired. Please reconnect Google Calendar.');
  }

  const calendarId = await getAscendCalendarId();

  const startDate = new Date(date);
  startDate.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setTime(startDate.getTime() + durationHours * 60 * 60 * 1000);

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

    console.log('Created event in Ascend calendar:', response.result.id);
    return response.result.id;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

// Delete an event from the Ascend calendar
export async function deleteGoogleCalendarEvent(eventId: string): Promise<void> {
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

// Update an event in Google Calendar
export async function updateGoogleCalendarEvent(
  eventId: string,
  title: string,
  startHour: number,
  durationHours: number,
  date: Date = new Date(),
  calendarId?: string
): Promise<void> {
  const isValid = await ensureValidToken();
  if (!isValid) {
    throw new Error('Google token expired. Please reconnect Google Calendar.');
  }

  const targetCalendarId = calendarId || await getAscendCalendarId();

  const startDate = new Date(date);
  startDate.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setTime(startDate.getTime() + durationHours * 60 * 60 * 1000);

  try {
    await gapi.client.calendar.events.update({
      calendarId: targetCalendarId,
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
  const isValid = await ensureValidToken();
  if (!isValid) {
    throw new Error('Google token expired. Please reconnect Google Calendar.');
  }

  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

  const googleEvents = await fetchGoogleCalendarEvents(startOfDay, endOfDay, true, false);

  const toAdd: CalendarEvent[] = [];
  const toUpdate: Array<{ localId: string | number; event: CalendarEvent }> = [];
  const toRemove: string[] = [];

  const localBlocksByGoogleId = new Map<string, typeof localBlocks[0]>();
  localBlocks.forEach(block => {
    if (block.googleEventId) {
      localBlocksByGoogleId.set(block.googleEventId, block);
    }
  });

  const googleEventIds = new Set(googleEvents.map(e => e.id));

  for (const googleEvent of googleEvents) {
    const localBlock = localBlocksByGoogleId.get(googleEvent.id);
    
    if (!localBlock) {
      toAdd.push(googleEvent);
    } else {
      const hasChanged = 
        localBlock.title !== googleEvent.title ||
        Math.abs(localBlock.start - googleEvent.start) > 0.01 ||
        Math.abs(localBlock.duration - googleEvent.duration) > 0.01;
      
      if (hasChanged) {
        toUpdate.push({ localId: localBlock.id, event: googleEvent });
      }
    }
  }

  for (const localBlock of localBlocks) {
    if (localBlock.googleEventId && !googleEventIds.has(localBlock.googleEventId)) {
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

// Legacy exports for backwards compatibility
export const clearSavedData = clearLocalData;
export const requestAccessToken = () => console.warn('Use startGoogleOAuth instead');
export const initGoogleIdentity = () => console.warn('Use backend OAuth instead');
export const handleOAuthRedirect = handleGoogleOAuthCallback;
export const revokeAccessToken = disconnectGoogle;

// Type declarations
declare global {
  interface Window {
    gapi: typeof gapi;
    google: typeof google;
  }
}
