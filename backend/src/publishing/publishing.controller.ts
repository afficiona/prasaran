import { Controller, Post, Get, Body, Req, Param, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { PublishingService } from './publishing.service';
import { AuthService } from '../auth/auth.service';

@Controller('publish')
export class PublishingController {
  constructor(
    private publishingService: PublishingService,
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

  @Post()
  async publish(
    @Body() body: { content: string; platforms: string[] },
    @Req() req: Request,
  ) {
    const userId = this.getUserIdFromRequest(req);
    return this.publishingService.createPublishJob(userId, body.content, body.platforms);
  }

  @Get('history')
  async getHistory(@Req() req: Request) {
    const userId = this.getUserIdFromRequest(req);
    return this.publishingService.getPublishHistory(userId);
  }

  @Get('job/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.publishingService.getJobStatus(jobId);
  }
}
