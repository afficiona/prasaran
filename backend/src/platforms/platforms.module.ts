import { Module } from '@nestjs/common';
import { PlatformsController } from './platforms.controller';
import { OAuthCallbackController } from './oauth-callback.controller';
import { PlatformsService } from './platforms.service';
import { ManchAdapter } from './manch-adapter.service';
import { AddaAdapter } from './adda-adapter.service';
import { SamoohAdapter } from './samooh-adapter.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PlatformsController, OAuthCallbackController],
  providers: [PlatformsService, ManchAdapter, AddaAdapter, SamoohAdapter],
  exports: [PlatformsService, ManchAdapter, AddaAdapter, SamoohAdapter],
})
export class PlatformsModule {}
