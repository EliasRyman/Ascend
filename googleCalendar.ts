// Google Calendar Integration Service
// Uses Google Identity Services (GIS) for OAuth and Google Calendar API

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

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
}

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gapiInited = false;
let gisInited = false;
let accessToken: string | null = null;

// Initialize the Google API client
export async function initGoogleApi(): Promise<void> {
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
    callback: (response) => {
      if (response.error !== undefined) {
        console.error('Token error:', response.error);
        return;
      }
      accessToken = response.access_token;
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

// Request access token (triggers OAuth popup)
export function requestAccessToken(): void {
  if (!tokenClient) {
    console.error('Token client not initialized');
    return;
  }

  if (accessToken === null) {
    // First time - prompt for consent
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    // Already have token, just request without prompt
    tokenClient.requestAccessToken({ prompt: '' });
  }
}

// Revoke access token (sign out)
export function revokeAccessToken(): void {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {
      console.log('Access token revoked');
      accessToken = null;
    });
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
  timeMax: Date
): Promise<CalendarEvent[]> {
  if (!accessToken) {
    throw new Error('Not signed in to Google');
  }

  try {
    const response = await gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events: GoogleCalendarEvent[] = response.result.items || [];
    
    return events
      .filter(event => event.start?.dateTime) // Only timed events, not all-day
      .map(event => {
        const startDate = new Date(event.start.dateTime!);
        const endDate = new Date(event.end.dateTime || event.start.dateTime!);
        
        const startHour = startDate.getHours() + startDate.getMinutes() / 60;
        const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

        return {
          id: event.id,
          title: event.summary || 'Untitled',
          start: startHour,
          duration: Math.max(0.25, durationHours), // Minimum 15 minutes
          isGoogle: true,
        };
      });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

// Create an event in Google Calendar
export async function createGoogleCalendarEvent(
  title: string,
  startHour: number,
  durationHours: number,
  date: Date = new Date()
): Promise<string> {
  if (!accessToken) {
    throw new Error('Not signed in to Google');
  }

  // Create start and end times
  const startDate = new Date(date);
  startDate.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setTime(startDate.getTime() + durationHours * 60 * 60 * 1000);

  try {
    const response = await gapi.client.calendar.events.insert({
      calendarId: 'primary',
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

    return response.result.id;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

// Delete an event from Google Calendar
export async function deleteGoogleCalendarEvent(eventId: string): Promise<void> {
  if (!accessToken) {
    throw new Error('Not signed in to Google');
  }

  try {
    await gapi.client.calendar.events.delete({
      calendarId: 'primary',
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
  date: Date = new Date()
): Promise<void> {
  if (!accessToken) {
    throw new Error('Not signed in to Google');
  }

  const startDate = new Date(date);
  startDate.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setTime(startDate.getTime() + durationHours * 60 * 60 * 1000);

  try {
    await gapi.client.calendar.events.update({
      calendarId: 'primary',
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

// Type declarations for Google APIs
declare global {
  interface Window {
    gapi: typeof gapi;
    google: typeof google;
  }
}

