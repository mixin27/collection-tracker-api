import { Module } from '@nestjs/common';
import { AppUpdateController } from './app-update.controller';
import { AppUpdateService } from './app-update.service';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  controllers: [AppUpdateController],
  providers: [AppUpdateService, PrismaService],
  exports: [AppUpdateService],
})
export class AppUpdateModule {}
