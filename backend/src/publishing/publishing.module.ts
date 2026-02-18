import { Module } from '@nestjs/common';
import { PublishingController } from './publishing.controller';
import { PublishingService } from './publishing.service';
import { PlatformsModule } from '../platforms/platforms.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PlatformsModule, AuthModule],
  controllers: [PublishingController],
  providers: [PublishingService],
})
export class PublishingModule {}
