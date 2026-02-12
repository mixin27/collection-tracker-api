import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  SuggestionQueryDto,
  TrackCollectionSuggestionDto,
  TrackTagSuggestionDto,
} from './dto/suggestions.dto';

@Injectable()
export class SuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCollectionSuggestions(query: SuggestionQueryDto) {
    const limit = Math.min(query.limit ?? 20, 100);
    const where: any = {};

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { type: { contains: query.q, mode: 'insensitive' } },
        { category: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.type) {
      where.type = { contains: query.type, mode: 'insensitive' };
    }
    if (query.category) {
      where.category = { contains: query.category, mode: 'insensitive' };
    }

    const suggestions = await this.prisma.collectionSuggestion.findMany({
      where,
      orderBy: [{ usageCount: 'desc' }, { lastUsedAt: 'desc' }],
      take: limit,
    });

    return { suggestions, total: suggestions.length, limit };
  }

  async getTagSuggestions(query: SuggestionQueryDto) {
    const limit = Math.min(query.limit ?? 20, 100);
    const where: any = {};

    if (query.q) {
      where.name = { contains: query.q, mode: 'insensitive' };
    }
    if (query.category) {
      where.category = { contains: query.category, mode: 'insensitive' };
    }

    const suggestions = await this.prisma.tagSuggestion.findMany({
      where,
      orderBy: [{ usageCount: 'desc' }, { lastUsedAt: 'desc' }],
      take: limit,
    });

    return { suggestions, total: suggestions.length, limit };
  }

  async trackCollectionSuggestion(dto: TrackCollectionSuggestionDto) {
    const name = dto.name.trim();
    const type = dto.type.trim();

    return this.prisma.collectionSuggestion.upsert({
      where: {
        name_type: {
          name,
          type,
        },
      },
      update: {
        usageCount: { increment: 1 },
        category: dto.category?.trim() || undefined,
        lastUsedAt: new Date(),
      },
      create: {
        name,
        type,
        category: dto.category?.trim() || null,
        usageCount: 1,
        lastUsedAt: new Date(),
      },
    });
  }

  async trackTagSuggestion(dto: TrackTagSuggestionDto) {
    const name = dto.name.trim();

    return this.prisma.tagSuggestion.upsert({
      where: { name },
      update: {
        usageCount: { increment: 1 },
        category: dto.category?.trim() || undefined,
        lastUsedAt: new Date(),
      },
      create: {
        name,
        category: dto.category?.trim() || null,
        usageCount: 1,
        lastUsedAt: new Date(),
      },
    });
  }
}
