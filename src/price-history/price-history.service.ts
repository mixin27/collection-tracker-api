import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreatePriceHistoryDto,
  UpdatePriceHistoryDto,
} from './dto/price-history.dto';

@Injectable()
export class PriceHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createForItem(userId: string, itemId: string, dto: CreatePriceHistoryDto) {
    await this.assertItemOwnership(userId, itemId);

    const entry = await this.prisma.priceHistory.create({
      data: {
        itemId,
        price: dto.price,
        source: dto.source,
        notes: dto.notes,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
      },
    });

    return { entry };
  }

  async listForItem(userId: string, itemId: string, limit = 50, offset = 0) {
    await this.assertItemOwnership(userId, itemId);

    const [entries, total] = await Promise.all([
      this.prisma.priceHistory.findMany({
        where: { itemId },
        orderBy: { recordedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.priceHistory.count({ where: { itemId } }),
    ]);

    return {
      itemId,
      entries,
      total,
      limit,
      offset,
      hasMore: offset + entries.length < total,
    };
  }

  async updateEntry(userId: string, id: string, dto: UpdatePriceHistoryDto) {
    const entry = await this.prisma.priceHistory.findFirst({
      where: {
        id,
        item: {
          collection: { userId },
          isDeleted: false,
        },
      },
      select: { id: true },
    });

    if (!entry) {
      throw new NotFoundException('Price history entry not found');
    }

    const updated = await this.prisma.priceHistory.update({
      where: { id },
      data: {
        price: dto.price,
        source: dto.source,
        notes: dto.notes,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
      },
    });

    return { entry: updated };
  }

  async deleteEntry(userId: string, id: string) {
    const entry = await this.prisma.priceHistory.findFirst({
      where: {
        id,
        item: {
          collection: { userId },
          isDeleted: false,
        },
      },
      select: { id: true },
    });

    if (!entry) {
      throw new NotFoundException('Price history entry not found');
    }

    await this.prisma.priceHistory.delete({
      where: { id },
    });

    return { deleted: true };
  }

  private async assertItemOwnership(userId: string, itemId: string) {
    const item = await this.prisma.item.findFirst({
      where: {
        id: itemId,
        isDeleted: false,
        collection: { userId },
      },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }
  }
}
