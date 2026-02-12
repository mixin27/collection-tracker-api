import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AdminGuard } from '@/common/guards/admin.guard';

@Module({
  controllers: [SessionsController],
  providers: [SessionsService, PrismaService, AdminGuard],
  exports: [SessionsService],
})
export class SessionsModule {}
