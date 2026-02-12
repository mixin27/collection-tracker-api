import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';
import { CreatePriceHistoryDto } from './dto/price-history.dto';

@Injectable()
export class ItemsService {
  private readonly logger = new Logger(ItemsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new item
   */
  async create(
    userId: string,
    dto: CreateItemDto,
    maxItemsPerCollection: number,
  ) {
    // Verify collection ownership
    const collection = await this.prisma.collection.findFirst({
      where: {
        id: dto.collectionId,
        userId,
        isDeleted: false,
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Check item limit for this collection
    const itemCount = await this.prisma.item.count({
      where: {
        collectionId: dto.collectionId,
        isDeleted: false,
      },
    });

    if (maxItemsPerCollection !== -1 && itemCount >= maxItemsPerCollection) {
      throw new ForbiddenException(
        `Item limit reached for this collection. Your plan allows ${maxItemsPerCollection} items per collection.`,
      );
    }

    // Check if item ID already exists
    const existing = await this.prisma.item.findUnique({
      where: { id: dto.id },
    });

    if (existing) {
      throw new ConflictException('Item with this ID already exists');
    }

    // Create item
    const item = await this.prisma.item.create({
      data: {
        id: dto.id,
        collectionId: dto.collectionId,
        title: dto.title,
        barcode: dto.barcode,
        coverImageUrl: dto.coverImageUrl,
        coverImagePath: dto.coverImagePath,
        description: dto.description,
        notes: dto.notes,
        metadata: dto.metadata,
        condition: dto.condition,
        purchasePrice: dto.purchasePrice,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        currentValue: dto.currentValue,
        location: dto.location,
        isFavorite: dto.isFavorite ?? false,
        isWishlist: dto.isWishlist ?? false,
        sortOrder: dto.sortOrder ?? 0,
        quantity: dto.quantity ?? 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Add tags if provided
    if (dto.tagIds && dto.tagIds.length > 0) {
      await this.addTags(item.id, dto.tagIds);
    }

    // Update collection item count
    await this.updateCollectionItemCount(dto.collectionId);

    this.logger.log(
      `Item created: ${item.id} in collection ${dto.collectionId}`,
    );
    return this.findOne(userId, item.id);
  }

  /**
   * Get all items for a user or collection
   */
  async findAll(
    userId: string,
    collectionId?: string,
    limit: number = 50,
    offset: number = 0,
    filters?: {
      isFavorite?: boolean;
      isWishlist?: boolean;
      search?: string;
    },
  ) {
    const where: any = {
      collection: { userId },
      isDeleted: false,
    };

    if (collectionId) {
      where.collectionId = collectionId;
    }

    if (filters?.isFavorite !== undefined) {
      where.isFavorite = filters.isFavorite;
    }

    if (filters?.isWishlist !== undefined) {
      where.isWishlist = filters.isWishlist;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        include: {
          itemTags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.item.count({ where }),
    ]);

    return {
      items,
      total,
      limit,
      hasMore: offset + items.length < total,
    };
  }

  /**
   * Get a single item by ID
   */
  async findOne(userId: string, id: string) {
    const item = await this.prisma.item.findFirst({
      where: {
        id,
        collection: { userId },
        isDeleted: false,
      },
      include: {
        itemTags: {
          include: {
            tag: true,
          },
        },
        loans: {
          where: {
            returnedDate: null,
          },
        },
        priceHistory: {
          orderBy: {
            recordedAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return item;
  }

  /**
   * Update an item
   */
  async update(userId: string, id: string, dto: UpdateItemDto) {
    // Verify ownership
    const existing = await this.prisma.item.findFirst({
      where: {
        id,
        collection: { userId },
        isDeleted: false,
      },
    });

    if (!existing) {
      throw new NotFoundException('Item not found');
    }

    const { tagIds, ...updateData } = dto;

    // Update item
    const updated = await this.prisma.item.update({
      where: { id },
      data: {
        ...updateData,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        version: existing.version + 1,
        updatedAt: new Date(),
      },
    });

    // Update tags if provided
    if (tagIds !== undefined) {
      // Remove all existing tags
      await this.prisma.itemTag.deleteMany({
        where: { itemId: id },
      });

      // Add new tags
      if (tagIds.length > 0) {
        await this.addTags(id, tagIds);
      }
    }

    this.logger.log(`Item updated: ${id}`);
    return this.findOne(userId, id);
  }

  /**
   * Soft delete an item
   */
  async remove(userId: string, id: string) {
    // Verify ownership
    const existing = await this.prisma.item.findFirst({
      where: {
        id,
        collection: { userId },
        isDeleted: false,
      },
    });

    if (!existing) {
      throw new NotFoundException('Item not found');
    }

    const deleted = await this.prisma.item.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        version: existing.version + 1,
        updatedAt: new Date(),
      },
    });

    // Update collection item count
    await this.updateCollectionItemCount(existing.collectionId);

    this.logger.log(`Item deleted: ${id} (soft delete)`);
    return deleted;
  }

  /**
   * Add tags to an item
   */
  private async addTags(itemId: string, tagIds: string[]) {
    const tagData = tagIds.map((tagId) => ({
      itemId,
      tagId,
    }));

    await this.prisma.itemTag.createMany({
      data: tagData,
      skipDuplicates: true,
    });
  }

  /**
   * Update collection's item count
   */
  private async updateCollectionItemCount(collectionId: string) {
    const count = await this.prisma.item.count({
      where: {
        collectionId,
        isDeleted: false,
      },
    });

    await this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        itemCount: count,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Bulk update sort order
   */
  async updateSortOrder(
    userId: string,
    updates: { id: string; sortOrder: number }[],
  ) {
    // Verify all items belong to user
    const itemIds = updates.map((u) => u.id);
    const items = await this.prisma.item.findMany({
      where: {
        id: { in: itemIds },
        collection: { userId },
        isDeleted: false,
      },
      select: { id: true },
    });

    if (items.length !== itemIds.length) {
      throw new NotFoundException('One or more items not found');
    }

    // Update sort orders
    await Promise.all(
      updates.map((update) =>
        this.prisma.item.update({
          where: { id: update.id },
          data: {
            sortOrder: update.sortOrder,
            updatedAt: new Date(),
          },
        }),
      ),
    );

    this.logger.log(`Sort order updated for ${updates.length} items`);
    return { updated: updates.length };
  }

  /**
   * Create a price history record for an item
   */
  async createPriceHistory(
    userId: string,
    itemId: string,
    dto: CreatePriceHistoryDto,
  ) {
    const item = await this.prisma.item.findFirst({
      where: {
        id: itemId,
        collection: { userId },
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const entry = await this.prisma.priceHistory.create({
      data: {
        itemId,
        price: dto.price,
        source: dto.source,
        notes: dto.notes,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
      },
    });

    return entry;
  }

  /**
   * Get price history records for an item
   */
  async getPriceHistory(userId: string, itemId: string, limit: number = 50) {
    const item = await this.prisma.item.findFirst({
      where: {
        id: itemId,
        collection: { userId },
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const history = await this.prisma.priceHistory.findMany({
      where: { itemId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    return { itemId, history, limit };
  }
}
