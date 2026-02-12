import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new collection
   */
  async create(
    userId: string,
    dto: CreateCollectionDto,
    maxCollections: number,
  ) {
    // Check if collection limit is reached
    const count = await this.prisma.collection.count({
      where: {
        userId,
        isDeleted: false,
      },
    });

    if (maxCollections !== -1 && count >= maxCollections) {
      throw new ForbiddenException(
        `Collection limit reached. Your plan allows ${maxCollections} collections. Upgrade to create more.`,
      );
    }

    // Check if collection with same ID already exists
    const existing = await this.prisma.collection.findUnique({
      where: { id: dto.id },
    });

    if (existing) {
      throw new ConflictException('Collection with this ID already exists');
    }

    const collection = await this.prisma.collection.create({
      data: {
        id: dto.id,
        userId,
        name: dto.name,
        type: dto.type,
        description: dto.description,
        coverImagePath: dto.coverImagePath,
        coverImageUrl: dto.coverImageUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Track suggestion usage to improve future collection suggestions.
    await this.prisma.collectionSuggestion.upsert({
      where: {
        name_type: {
          name: dto.name.trim(),
          type: dto.type.trim(),
        },
      },
      update: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
      create: {
        name: dto.name.trim(),
        type: dto.type.trim(),
        usageCount: 1,
        lastUsedAt: new Date(),
      },
    });

    this.logger.log(`Collection created: ${collection.id} for user ${userId}`);
    return collection;
  }

  /**
   * Get all collections for a user
   */
  async findAll(userId: string, limit: number = 50, offset: number = 0) {
    const [collections, total] = await Promise.all([
      this.prisma.collection.findMany({
        where: {
          userId,
          isDeleted: false,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.collection.count({
        where: {
          userId,
          isDeleted: false,
        },
      }),
    ]);

    return {
      collections,
      total,
      limit,
      hasMore: offset + collections.length < total,
    };
  }

  /**
   * Get a single collection by ID
   */
  async findOne(userId: string, id: string) {
    const collection = await this.prisma.collection.findFirst({
      where: {
        id,
        userId,
        isDeleted: false,
      },
      include: {
        items: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return collection;
  }

  /**
   * Update a collection
   */
  async update(userId: string, id: string, dto: UpdateCollectionDto) {
    // Verify ownership
    const existing = await this.prisma.collection.findFirst({
      where: {
        id,
        userId,
        isDeleted: false,
      },
    });

    if (!existing) {
      throw new NotFoundException('Collection not found');
    }

    const updated = await this.prisma.collection.update({
      where: { id },
      data: {
        ...dto,
        version: existing.version + 1,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Collection updated: ${id}`);
    return updated;
  }

  /**
   * Soft delete a collection
   */
  async remove(userId: string, id: string) {
    // Verify ownership
    const existing = await this.prisma.collection.findFirst({
      where: {
        id,
        userId,
        isDeleted: false,
      },
    });

    if (!existing) {
      throw new NotFoundException('Collection not found');
    }

    // Soft delete collection (cascade will soft delete items via trigger or app logic)
    const deleted = await this.prisma.collection.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        version: existing.version + 1,
        updatedAt: new Date(),
      },
    });

    // Soft delete all items in this collection
    await this.prisma.item.updateMany({
      where: {
        collectionId: id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Collection deleted: ${id} (soft delete)`);
    return deleted;
  }

  /**
   * Get collection statistics
   */
  async getStats(userId: string) {
    const [totalCollections, totalItems, favoriteItems, wishlistItems] =
      await Promise.all([
        this.prisma.collection.count({
          where: { userId, isDeleted: false },
        }),
        this.prisma.item.count({
          where: {
            collection: { userId },
            isDeleted: false,
          },
        }),
        this.prisma.item.count({
          where: {
            collection: { userId },
            isDeleted: false,
            isFavorite: true,
          },
        }),
        this.prisma.item.count({
          where: {
            collection: { userId },
            isDeleted: false,
            isWishlist: true,
          },
        }),
      ]);

    return {
      totalCollections,
      totalItems,
      favoriteItems,
      wishlistItems,
    };
  }

  /**
   * Search collections by name or type
   */
  async search(userId: string, query: string, limit: number = 20) {
    const collections = await this.prisma.collection.findMany({
      where: {
        userId,
        isDeleted: false,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { type: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return { collections };
  }
}
