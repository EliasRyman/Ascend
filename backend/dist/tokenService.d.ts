export declare const oauth2Client: import("google-auth-library").OAuth2Client;
export declare function getAuthUrl(state: string): string;
export declare function exchangeCodeForTokens(code: string): Promise<import("google-auth-library").Credentials>;
export declare function getGoogleUserInfo(accessToken: string): Promise<import("googleapis").oauth2_v2.Schema$Userinfo>;
export declare function storeTokens(userId: string, refreshToken: string, accessToken: string, expiryDate: number | null, googleEmail: string): Promise<void>;
export declare function getStoredTokens(userId: string): Promise<{
    refreshToken: string;
    accessToken: any;
    tokenExpiry: Date | null;
    googleEmail: any;
} | null>;
export declare function refreshAccessToken(userId: string): Promise<string | null>;
export declare function getValidAccessToken(userId: string): Promise<string | null>;
export declare function deleteTokens(userId: string): Promise<void>;
export declare function hasGoogleConnection(userId: string): Promise<boolean>;
//# sourceMappingURL=tokenService.d.ts.map