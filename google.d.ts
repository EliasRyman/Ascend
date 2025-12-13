// Type definitions for Google Identity Services and Google API Client

declare namespace google.accounts.oauth2 {
  interface TokenClient {
    requestAccessToken(options?: { prompt?: string }): void;
  }

  interface TokenResponse {
    access_token: string;
    error?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }

  function initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
  }): TokenClient;

  function revoke(token: string, callback?: () => void): void;
}

declare namespace gapi {
  function load(api: string, callback: () => void): void;
  
  namespace client {
    function init(config: { discoveryDocs?: string[] }): Promise<void>;
    
    namespace calendar {
      namespace events {
        function list(params: {
          calendarId: string;
          timeMin: string;
          timeMax: string;
          singleEvents?: boolean;
          orderBy?: string;
        }): Promise<{ result: { items: any[] } }>;

        function insert(params: {
          calendarId: string;
          resource: any;
        }): Promise<{ result: { id: string } }>;

        function update(params: {
          calendarId: string;
          eventId: string;
          resource: any;
        }): Promise<any>;

        function delete(params: {
          calendarId: string;
          eventId: string;
        }): Promise<void>;
      }
    }
  }
}

