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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3003';

    try {
      console.log('OAuth callback received:', { code: code?.substring(0, 10) + '...', state, platform });

      // For POC, we need to extract userId from state
      // In a real app, we'd decode the state properly
      const db = (this.platformsService as any).databaseService.getDb();
      const stateRecord = db.prepare('SELECT * FROM oauth_states WHERE state = ?').get(state) as any;

      console.log('State record found:', stateRecord ? 'yes' : 'no');

      if (!stateRecord) {
        console.error('Invalid state - no record found');
        return res.redirect(`${frontendUrl}/dashboard?error=Invalid+state`);
      }

      // Use the platform parameter from the query string
      const platformName = platform || 'Manch';
      console.log('Calling handleOAuthCallback for platform:', platformName, 'userId:', stateRecord.user_id);

      await this.platformsService.handleOAuthCallback(code, state, stateRecord.user_id, platformName);

      console.log('OAuth callback completed successfully');

      // Redirect back to Prasaran frontend
      res.redirect(`${frontendUrl}/dashboard?connected=true`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${frontendUrl}/dashboard?error=${encodeURIComponent((error as Error).message)}`);
    }
  }
}
