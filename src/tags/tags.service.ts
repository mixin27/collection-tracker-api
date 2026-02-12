import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new tag
   */
  async create(userId: string, dto: CreateTagDto, maxTags: number) {
    // Check tag limit
    const count = await this.prisma.tag.count({
      where: {
        userId,
        isDeleted: false,
      },
    });

    if (maxTags !== -1 && count >= maxTags) {
      throw new ForbiddenException(
        `Tag limit reached. Your plan allows ${maxTags} tags. Upgrade to create more.`,
      );
    }

    // Check for duplicate tag name (case-insensitive)
    const existing = await this.prisma.tag.findFirst({
      where: {
        userId,
        name: {
          equals: dto.name,
          mode: 'insensitive',
        },
        isDeleted: false,
      },
    });

    if (existing) {
      throw new ConflictException('A tag with this name already exists');
    }

    // Check if tag ID already exists
    const existingId = await this.prisma.tag.findUnique({
      where: { id: dto.id },
    });

    if (existingId) {
      throw new ConflictException('Tag with this ID already exists');
    }

    const tag = await this.prisma.tag.create({
      data: {
        id: dto.id,
        userId,
        name: dto.name,
        color: dto.color,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Track suggestion usage to improve global tag suggestions.
    await this.prisma.tagSuggestion.upsert({
      where: { name: dto.name.trim() },
      update: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
      create: {
        name: dto.name.trim(),
        usageCount: 1,
        lastUsedAt: new Date(),
      },
    });

    this.logger.log(`Tag created: ${tag.id} (${tag.name}) for user ${userId}`);
    return tag;
  }

  /**
   * Get all tags for a user
   */
  async findAll(userId: string) {
    const tags = await this.prisma.tag.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            itemTags: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform to include item count
    const tagsWithCount = tags.map((tag) => ({
      ...tag,
      itemCount: tag._count.itemTags,
      _count: undefined,
    }));

    return {
      tags: tagsWithCount,
      total: tags.length,
    };
  }

  /**
   * Get a single tag by ID
   */
  async findOne(userId: string, id: string) {
    const tag = await this.prisma.tag.findFirst({
      where: {
        id,
        userId,
        isDeleted: false,
      },
      include: {
        itemTags: {
          include: {
            item: {
              select: {
                id: true,
                title: true,
                coverImageUrl: true,
                coverImagePath: true,
              },
            },
          },
        },
        _count: {
          select: {
            itemTags: true,
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return {
      ...tag,
      itemCount: tag._count.itemTags,
      _count: undefined,
    };
  }

  /**
   * Update a tag
   */
  async update(userId: string, id: string, dto: UpdateTagDto) {
    // Verify ownership
    const existing = await this.prisma.tag.findFirst({
      where: {
        id,
        userId,
        isDeleted: false,
      },
    });

    if (!existing) {
      throw new NotFoundException('Tag not found');
    }

    // Check for duplicate name if name is being updated
    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await this.prisma.tag.findFirst({
        where: {
          userId,
          name: {
            equals: dto.name,
            mode: 'insensitive',
          },
          isDeleted: false,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException('A tag with this name already exists');
      }
    }

    const updated = await this.prisma.tag.update({
      where: { id },
      data: {
        ...dto,
        version: existing.version + 1,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Tag updated: ${id}`);
    return updated;
  }

  /**
   * Soft delete a tag
   */
  async remove(userId: string, id: string) {
    // Verify ownership
    const existing = await this.prisma.tag.findFirst({
      where: {
        id,
        userId,
        isDeleted: false,
      },
    });

    if (!existing) {
      throw new NotFoundException('Tag not found');
    }

    // Soft delete tag (item associations will remain for sync purposes)
    const deleted = await this.prisma.tag.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        version: existing.version + 1,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Tag deleted: ${id} (soft delete)`);
    return deleted;
  }

  /**
   * Get popular tags (for suggestions)
   */
  async getPopular(limit: number = 20) {
    const tags = await this.prisma.tag.groupBy({
      by: ['name', 'color'],
      where: {
        isDeleted: false,
      },
      _count: {
        name: true,
      },
      orderBy: {
        _count: {
          name: 'desc',
        },
      },
      take: limit,
    });

    return {
      tags: tags.map((t) => ({
        name: t.name,
        color: t.color,
        usageCount: t._count.name,
      })),
    };
  }
}
