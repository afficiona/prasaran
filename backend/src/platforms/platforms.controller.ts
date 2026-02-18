import { Controller, Get, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { PlatformsService } from './platforms.service';
import { AuthService } from '../auth/auth.service';

@Controller('platforms')
export class PlatformsController {
  constructor(
    private platformsService: PlatformsService,
    private authService: AuthService,
  ) {}

  private getUserIdFromRequest(req: Request): string {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const payload = this.authService.verifyToken(token) as any;
    return payload.userId;
  }

  @Get('connect')
  async connectPlatform(
    @Query('platform') platform: string,
    @Req() req: Request,
  ) {
    const userId = this.getUserIdFromRequest(req);
    const redirectUri = process.env.OAUTH_REDIRECT_URI || 'http://localhost:3001/api/oauth/callback';
    const authUrl = this.platformsService.getAuthUrl(userId, platform, redirectUri);

    return { authUrl };
  }

  @Get()
  async getConnectedPlatforms(@Req() req: Request) {
    const userId = this.getUserIdFromRequest(req);
    return this.platformsService.getConnectedPlatforms(userId);
  }

  @Post('disconnect')
  async disconnect(
    @Query('platform') platform: string,
    @Req() req: Request,
  ) {
    const userId = this.getUserIdFromRequest(req);
    return this.platformsService.disconnect(userId, platform);
  }
}
