// Google Calendar Integration Service
// Uses Backend OAuth with Refresh Tokens for persistent connection

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const ASCEND_CALENDAR_NAME = 'Ascend';

// Backend URL - Production Railway server
// For local development, set VITE_BACKEND_URL=http://localhost:4000 in .env
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://hmnbdkwjgmwchuyhtmqh.supabase.co/functions/v1/google-auth';

// Google Calendar color IDs mapping (by tag name)
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

// Google Calendar color palette with their hex values
const GOOGLE_COLOR_PALETTE: { id: string; hex: string }[] = [
  { id: '1', hex: '#7986cb' },  // Lavender
  { id: '2', hex: '#33b679' },  // Sage
  { id: '3', hex: '#8e24aa' },  // Grape
  { id: '4', hex: '#e67c73' },  // Flamingo
  { id: '5', hex: '#f6bf26' },  // Banana
  { id: '6', hex: '#f4511e' },  // Tangerine
  { id: '7', hex: '#039be5' },  // Peacock
  { id: '8', hex: '#616161' },  // Graphite
  { id: '9', hex: '#3f51b5' },  // Blueberry
  { id: '10', hex: '#0b8043' }, // Basil
  { id: '11', hex: '#d50000' }, // Tomato
];

// Helper function to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Calculate color distance using simple Euclidean distance
function colorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return Infinity;
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
}

// Map a hex color to the closest Google Calendar colorId
export function mapHexToGoogleColorId(hex: string): string {
  if (!hex || !hex.startsWith('#')) return '3'; // Default to Grape (Vindruva)

  let closestColorId = '3';
  let minDistance = Infinity;

  for (const color of GOOGLE_COLOR_PALETTE) {
    const distance = colorDistance(hex, color.hex);
    if (distance < minDistance) {
      minDistance = distance;
      closestColorId = color.id;
    }
  }

  return closestColorId;
}

// Google color names for debugging
const GOOGLE_COLOR_NAMES: Record<string, string> = {
  '1': 'Lavender',
  '2': 'Sage',
  '3': 'Grape (Vindruva)',
  '4': 'Flamingo',
  '5': 'Banana',
  '6': 'Tangerine',
  '7': 'Peacock',
  '8': 'Graphite',
  '9': 'Blueberry',
  '10': 'Basil',
  '11': 'Tomato',
};

// Reverse mapping: Google colorId -> Hex color (for fetching events back)
const GOOGLE_ID_TO_HEX: Record<string, string> = {
  '1': '#7986cb',  // Lavender
  '2': '#33b679',  // Sage
  '3': '#8e24aa',  // Grape
  '4': '#e67c73',  // Flamingo
  '5': '#f6bf26',  // Banana
  '6': '#f4511e',  // Tangerine
  '7': '#039be5',  // Peacock
  '8': '#616161',  // Graphite
  '9': '#3f51b5',  // Blueberry
  '10': '#0b8043', // Basil
  '11': '#d50000', // Tomato
};

// Map Google colorId back to app's hex color
export function mapGoogleIdToAppColor(colorId?: string): string | undefined {
  if (!colorId) return undefined;
  return GOOGLE_ID_TO_HEX[colorId];
}

// Main function to get Google colorId from app color
// Returns "3" (Grape) as default if no color provided
export function getGoogleColorId(hexColor?: string | null, tagName?: string | null): string {
  // Priority 1: Hex color provided - map to closest Google color
  if (hexColor && hexColor.startsWith('#')) {
    return mapHexToGoogleColorId(hexColor);
  }

  // Priority 2: Tag name provided - use tag color mapping
  if (tagName) {
    const tagLower = tagName.toLowerCase();
    if (TAG_COLOR_MAP[tagLower]) {
      return TAG_COLOR_MAP[tagLower];
    }
  }

  // Priority 3: Default to Grape (Vindruva)
  return '3';
}

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
      console.error('❌ DEBUG: Google Auth Token Error:', data);
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
      } catch (error: any) {
        // Skip 404 errors silently (calendar may have been deleted/unsubscribed)
        if (is404Error(error)) {
          console.warn(`Calendar ${calendar.summary} not found (404), skipping...`);
        } else {
          console.error(`Error fetching events from calendar ${calendar.summary}:`, error);
        }
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
      } catch (error: any) {
        // Handle 404 - Ascend calendar was deleted
        if (is404Error(error)) {
          console.warn('Ascend calendar not found (404), creating new one...');
          try {
            await resetAndCreateNewCalendar();
            // Don't retry fetching - the new calendar will be empty anyway
          } catch (recreateError) {
            console.error('Failed to recreate Ascend calendar:', recreateError);
          }
        } else {
          console.error('Error fetching Ascend calendar events:', error);
        }
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

  // IMPORTANT: Use event's colorId to get the actual event color
  // If the event has a colorId, convert it to hex; otherwise use calendar's default color
  const eventColor = event.colorId ? mapGoogleIdToAppColor(event.colorId) : undefined;

  console.log('📥 Mapping Google event:', {
    title: event.summary,
    colorId: event.colorId,
    mappedColor: eventColor,
    calendarColor: calendarColor
  });

  return {
    id: event.id,
    title: event.summary || 'Untitled',
    start: startHour,
    duration: Math.max(0.25, durationHours),
    isGoogle: true,
    isFromAscendCalendar: isFromAscend,
    colorId: event.colorId,
    calendarName,
    // Use event's color if available, otherwise calendar's color
    calendarColor: eventColor || calendarColor,
    calendarId,
    canEdit,
  };
}

// Helper to reset calendar ID and create new one (for 404 recovery)
async function resetAndCreateNewCalendar(): Promise<string> {
  console.log('Calendar not found (404). Resetting and creating new Ascend calendar...');

  // Clear saved calendar ID
  localStorage.removeItem(STORAGE_KEY_CALENDAR_ID);
  ascendCalendarId = null;

  // Create new calendar
  return await findOrCreateAscendCalendar();
}

// Check if error is a 404 (calendar not found)
function is404Error(error: any): boolean {
  return error?.status === 404 ||
    error?.result?.error?.code === 404 ||
    error?.code === 404;
}

// Create an event in the Ascend calendar
export async function createGoogleCalendarEvent(
  title: string,
  startHour: number,
  durationHours: number,
  date: Date = new Date(),
  tag?: string,
  hexColor?: string
): Promise<string> {
  const isValid = await ensureValidToken();
  if (!isValid) {
    throw new Error('Google token expired. Please reconnect Google Calendar.');
  }

  let calendarId = await getAscendCalendarId();

  const startDate = new Date(date);
  startDate.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);

  const endDate = new Date(startDate);
  endDate.setTime(startDate.getTime() + durationHours * 60 * 60 * 1000);

  // Determine colorId: prefer hex color mapping, fallback to tag mapping, then Grape as default
  const colorId = getGoogleColorId(hexColor, tag);

  console.log('🎨 Color mapping:', {
    input: { hexColor, tag },
    output: colorId,
    colorName: GOOGLE_COLOR_NAMES[colorId] || 'Unknown'
  });

  const eventResource = {
    summary: title,
    colorId: colorId, // MUST be inside resource object for gapi
    description: tag ? `Tag: ${tag}` : undefined,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  console.log('📤 Sending to Google Calendar:', JSON.stringify(eventResource, null, 2));

  try {
    const response = await gapi.client.calendar.events.insert({
      calendarId: calendarId,
      resource: eventResource,
    });

    console.log('Created event in Ascend calendar:', response.result.id);
    return response.result.id;
  } catch (error: any) {
    // Handle 404 - calendar was deleted
    if (is404Error(error)) {
      console.warn('Calendar 404 detected, attempting recovery...');
      calendarId = await resetAndCreateNewCalendar();

      // Retry with new calendar
      const retryResponse = await gapi.client.calendar.events.insert({
        calendarId: calendarId,
        resource: eventResource,
      });

      console.log('Created event in new Ascend calendar:', retryResponse.result.id);
      return retryResponse.result.id;
    }

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
  } catch (error: any) {
    // If calendar or event not found (404), just log and continue
    if (is404Error(error)) {
      console.warn('Calendar or event not found (404), skipping delete:', eventId);
      // Reset calendar ID for next operations
      await resetAndCreateNewCalendar();
      return;
    }
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
  calendarId?: string,
  hexColor?: string
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

  // Always include colorId - use Grape as default if no color provided
  const colorId = getGoogleColorId(hexColor, null);

  console.log('🎨 Update color mapping:', {
    input: { hexColor },
    output: colorId,
    colorName: GOOGLE_COLOR_NAMES[colorId] || 'Unknown'
  });

  const eventResource: any = {
    summary: title,
    colorId: colorId, // Always set colorId
    start: {
      dateTime: startDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  console.log('📤 Updating Google Calendar event:', JSON.stringify(eventResource, null, 2));

  try {
    await gapi.client.calendar.events.update({
      calendarId: targetCalendarId,
      eventId: eventId,
      resource: eventResource,
    });
  } catch (error: any) {
    // If calendar or event not found (404), log and don't throw
    if (is404Error(error)) {
      console.warn('Calendar or event not found (404), skipping update:', eventId);
      // Reset calendar ID for next operations
      await resetAndCreateNewCalendar();
      return;
    }
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
