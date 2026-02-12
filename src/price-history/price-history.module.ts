import { Module } from '@nestjs/common';
import { PriceHistoryController } from './price-history.controller';
import { PriceHistoryService } from './price-history.service';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  controllers: [PriceHistoryController],
  providers: [PriceHistoryService, PrismaService],
  exports: [PriceHistoryService],
})
export class PriceHistoryModule {}
