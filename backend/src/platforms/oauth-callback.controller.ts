import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PlatformsService } from './platforms.service';

@Controller('oauth')
export class OAuthCallbackController {
  constructor(private platformsService: PlatformsService) {}

  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('platform') platform: string,
    @Res() res: Response,
  ) {
    try {
      // For POC, we need to extract userId from state
      // In a real app, we'd decode the state properly
      const db = (this.platformsService as any).databaseService.getDb();
      const stateRecord = db.prepare('SELECT * FROM oauth_states WHERE state = ?').get(state) as any;

      if (!stateRecord) {
        return res.redirect('http://localhost:3003/dashboard?error=Invalid+state');
      }

      // Use the platform parameter from the query string
      const platformName = platform || 'Manch';
      await this.platformsService.handleOAuthCallback(code, state, stateRecord.user_id, platformName);

      // Redirect back to Prasaran frontend
      res.redirect('http://localhost:3003/dashboard?connected=true');
    } catch (error) {
      res.redirect(`http://localhost:3003/dashboard?error=${encodeURIComponent((error as Error).message)}`);
    }
  }
}
