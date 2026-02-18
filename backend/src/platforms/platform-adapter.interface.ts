export interface PlatformAdapter {
  getPlatformName(): string;
  getAuthUrl(userId: string, redirectUri: string): string;
  handleCallback(code: string, state: string, userId: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  }>;
  publishContent(userId: string, content: string): Promise<{ externalPostId: string }>;
  disconnect(userId: string): Promise<void>;
}
