import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ManchAdapter } from './manch-adapter.service';
import { AddaAdapter } from './adda-adapter.service';
import { SamoohAdapter } from './samooh-adapter.service';
import { randomUUID } from 'crypto';

@Injectable()
export class PlatformsService {
  constructor(
    private databaseService: DatabaseService,
    private manchAdapter: ManchAdapter,
    private addaAdapter: AddaAdapter,
    private samoohAdapter: SamoohAdapter,
  ) {}

  private getAdapter(platformName: string) {
    switch (platformName) {
      case 'Manch':
        return this.manchAdapter;
      case 'Adda':
        return this.addaAdapter;
      case 'Samooh':
        return this.samoohAdapter;
      default:
        throw new Error(`Unsupported platform: ${platformName}`);
    }
  }

  getAuthUrl(userId: string, platformName: string, redirectUri: string) {
    const adapter = this.getAdapter(platformName);
    return adapter.getAuthUrl(userId, redirectUri);
  }

  async handleOAuthCallback(code: string, state: string, userId: string, platformName: string) {
    const adapter = this.getAdapter(platformName);
    const tokens = await adapter.handleCallback(code, state, userId);

    const db = this.databaseService.getDb();
    const platform = db.prepare('SELECT * FROM platforms WHERE name = ?').get(platformName) as any;

    if (!platform) {
      throw new Error(`Platform ${platformName} not found`);
    }

    // Store connection (for POC, storing tokens as plain text)
    const connectionId = randomUUID();
    db.prepare(`
      INSERT OR REPLACE INTO user_platform_connections
      (id, user_id, platform_id, access_token_encrypted, refresh_token_encrypted, expires_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(
      connectionId,
      userId,
      platform.id,
      tokens.accessToken,
      tokens.refreshToken || null,
      tokens.expiresAt || null,
      Date.now()
    );

    return { success: true, platform: platformName };
  }

  getConnectedPlatforms(userId: string) {
    const db = this.databaseService.getDb();
    const connections = db.prepare(`
      SELECT p.name, p.id, upc.created_at, upc.status
      FROM user_platform_connections upc
      JOIN platforms p ON upc.platform_id = p.id
      WHERE upc.user_id = ? AND upc.status = 'active'
    `).all(userId);

    return connections;
  }

  async disconnect(userId: string, platformName: string) {
    const adapter = this.getAdapter(platformName);
    await adapter.disconnect(userId);
    return { success: true };
  }
}
