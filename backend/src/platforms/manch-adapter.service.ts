import { Injectable } from '@nestjs/common';
import { PlatformAdapter } from './platform-adapter.interface';
import { DatabaseService } from '../database/database.service';
import axios from 'axios';
import { randomUUID } from 'crypto';

const MANCH_API_URL = process.env.MANCH_API_URL || 'http://localhost:3000';
const MANCH_FRONTEND_URL = process.env.MANCH_FRONTEND_URL || 'http://localhost:3002';
const CLIENT_ID = 'prasaran-client-id';
const CLIENT_SECRET = 'prasaran-client-secret';

@Injectable()
export class ManchAdapter implements PlatformAdapter {
  constructor(private databaseService: DatabaseService) {}

  getPlatformName(): string {
    return 'Manch';
  }

  getAuthUrl(userId: string, redirectUri: string): string {
    const state = randomUUID();

    // Store state for verification
    const db = this.databaseService.getDb();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS oauth_states (
        state TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `).run();

    db.prepare(`
      INSERT OR REPLACE INTO oauth_states (state, user_id, created_at)
      VALUES (?, ?, ?)
    `).run(state, userId, Date.now());

    // Append platform parameter to redirect URI
    const redirectUriWithPlatform = `${redirectUri}${redirectUri.includes('?') ? '&' : '?'}platform=Manch`;
    return `${MANCH_FRONTEND_URL}/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUriWithPlatform)}&state=${state}&response_type=code`;
  }

  async handleCallback(code: string, state: string, userId: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  }> {
    // Verify state
    const db = this.databaseService.getDb();
    const stateRecord = db.prepare('SELECT * FROM oauth_states WHERE state = ? AND user_id = ?').get(state, userId) as any;

    if (!stateRecord) {
      throw new Error('Invalid state parameter');
    }

    // Delete used state
    db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);

    // Exchange code for token
    const baseRedirectUri = process.env.OAUTH_REDIRECT_URI || 'http://localhost:3001/api/oauth/callback';
    const redirectUriWithPlatform = `${baseRedirectUri}${baseRedirectUri.includes('?') ? '&' : '?'}platform=Manch`;
    const tokenResponse = await axios.post(`${MANCH_API_URL}/api/oauth/token`, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUriWithPlatform,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });

    return {
      accessToken: tokenResponse.data.access_token,
      expiresAt: Date.now() + (tokenResponse.data.expires_in * 1000),
    };
  }

  async publishContent(userId: string, content: string): Promise<{ externalPostId: string }> {
    const db = this.databaseService.getDb();

    // Get user's connection for Manch
    const connection = db.prepare(`
      SELECT upc.* FROM user_platform_connections upc
      JOIN platforms p ON upc.platform_id = p.id
      WHERE upc.user_id = ? AND p.name = 'Manch' AND upc.status = 'active'
    `).get(userId) as any;

    if (!connection) {
      throw new Error('No active Manch connection found');
    }

    // For POC, we're storing tokens in plain text (in production, use encryption)
    const accessToken = connection.access_token_encrypted;

    // Publish to Manch
    const response = await axios.post(
      `${MANCH_API_URL}/api/posts`,
      { content },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { externalPostId: response.data.id };
  }

  async disconnect(userId: string): Promise<void> {
    const db = this.databaseService.getDb();

    // Get the connection to retrieve the access token
    const connection = db.prepare(`
      SELECT upc.* FROM user_platform_connections upc
      JOIN platforms p ON upc.platform_id = p.id
      WHERE upc.user_id = ? AND p.name = 'Manch'
    `).get(userId) as any;

    if (!connection) {
      throw new Error('No Manch connection found');
    }

    const accessToken = connection.access_token_encrypted;

    // Revoke the token at Manch
    try {
      await axios.post(`${MANCH_API_URL}/api/oauth/revoke`, {
        token: accessToken,
      });
    } catch (error) {
      // Log error but continue with local deletion
      console.error('Failed to revoke token at Manch:', error);
    }

    // Delete the connection record (hard delete)
    db.prepare(`
      DELETE FROM user_platform_connections
      WHERE user_id = ? AND platform_id = (SELECT id FROM platforms WHERE name = 'Manch')
    `).run(userId);
  }
}
