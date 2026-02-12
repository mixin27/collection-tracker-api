import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  SyncRequestDto,
  SyncResponseDto,
  SyncCollectionDto,
  SyncItemDto,
  SyncTagDto,
  ConflictDto,
} from './dto/sync.dto';
import { SyncType } from '@/generated/prisma/client';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly maxBatchSize: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.maxBatchSize = this.configService.get<number>(
      'app.sync.maxBatchSize',
      1000,
    );
  }

  /**
   * Full synchronization - Initial sync or reset
   */
  async fullSync(
    userId: string,
    dto: SyncRequestDto,
  ): Promise<SyncResponseDto> {
    const startTime = Date.now();
    const conflicts: ConflictDto[] = [];

    this.logger.log(
      `Starting full sync for user ${userId}, device ${dto.deviceId}`,
    );

    // Get all server data
    const [serverCollections, serverItems, serverTags] = await Promise.all([
      this.getServerCollections(userId),
      this.getServerItems(userId),
      this.getServerTags(userId),
    ]);

    // Process client changes if provided
    let syncedCollections = 0;
    let syncedItems = 0;
    let syncedTags = 0;

    if (dto.changes) {
      const result = await this.processClientChanges(
        userId,
        dto.changes,
        null,
        conflicts,
      );
      syncedCollections = result.syncedCollections;
      syncedItems = result.syncedItems;
      syncedTags = result.syncedTags;
    }

    const lastSyncAt = new Date().toISOString();
    const duration = Date.now() - startTime;

    // Log sync
    await this.logSync(
      userId,
      dto.deviceId,
      SyncType.FULL,
      syncedCollections,
      syncedItems,
      syncedTags,
      conflicts.length,
      startTime,
      duration,
    );

    this.logger.log(
      `Full sync completed for user ${userId}: ${syncedCollections} collections, ${syncedItems} items, ${syncedTags} tags, ${conflicts.length} conflicts, ${duration}ms`,
    );

    return {
      serverChanges: {
        collections: serverCollections,
        items: serverItems,
        tags: serverTags,
      },
      conflicts,
      lastSyncAt,
      syncedCollections,
      syncedItems,
      syncedTags,
      conflictsResolved: conflicts.length,
    };
  }

  /**
   * Incremental synchronization - Delta sync
   */
  async incrementalSync(
    userId: string,
    dto: SyncRequestDto,
  ): Promise<SyncResponseDto> {
    const startTime = Date.now();
    const conflicts: ConflictDto[] = [];

    if (!dto.lastSyncAt) {
      throw new BadRequestException(
        'lastSyncAt is required for incremental sync',
      );
    }

    const lastSyncDate = new Date(dto.lastSyncAt);
    this.logger.log(
      `Starting incremental sync for user ${userId}, device ${dto.deviceId}, since ${dto.lastSyncAt}`,
    );

    // Get server changes since lastSyncAt
    const [serverCollections, serverItems, serverTags] = await Promise.all([
      this.getServerCollectionsSince(userId, lastSyncDate),
      this.getServerItemsSince(userId, lastSyncDate),
      this.getServerTagsSince(userId, lastSyncDate),
    ]);

    // Process client changes
    let syncedCollections = 0;
    let syncedItems = 0;
    let syncedTags = 0;

    if (dto.changes) {
      const result = await this.processClientChanges(
        userId,
        dto.changes,
        lastSyncDate,
        conflicts,
      );
      syncedCollections = result.syncedCollections;
      syncedItems = result.syncedItems;
      syncedTags = result.syncedTags;
    }

    const newLastSyncAt = new Date().toISOString();
    const duration = Date.now() - startTime;

    // Update user's lastSyncAt
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastSyncAt: new Date(newLastSyncAt) },
    });

    // Log sync
    await this.logSync(
      userId,
      dto.deviceId,
      SyncType.INCREMENTAL,
      syncedCollections,
      syncedItems,
      syncedTags,
      conflicts.length,
      startTime,
      duration,
    );

    this.logger.log(
      `Incremental sync completed for user ${userId}: ${syncedCollections} collections, ${syncedItems} items, ${syncedTags} tags, ${conflicts.length} conflicts, ${duration}ms`,
    );

    return {
      serverChanges: {
        collections: serverCollections,
        items: serverItems,
        tags: serverTags,
      },
      conflicts,
      lastSyncAt: newLastSyncAt,
      syncedCollections,
      syncedItems,
      syncedTags,
      conflictsResolved: conflicts.length,
    };
  }

  /**
   * Get sync status for user
   */
  async getSyncStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastSyncAt: true },
    });

    const lastSync = await this.prisma.syncLog.findFirst({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    });

    return {
      lastSyncAt: user?.lastSyncAt?.toISOString() || null,
      totalSyncs: await this.prisma.syncLog.count({ where: { userId } }),
      lastSyncDuration: lastSync?.durationMs || null,
      pendingChanges: false, // Could be calculated based on updatedAt > lastSyncAt
    };
  }

  /**
   * Process client changes and apply to server
   */
  private async processClientChanges(
    userId: string,
    changes: any,
    lastSyncAt: Date | null,
    conflicts: ConflictDto[],
  ) {
    let syncedCollections = 0;
    let syncedItems = 0;
    let syncedTags = 0;

    // Process collections
    if (changes.collections && changes.collections.length > 0) {
      syncedCollections = await this.syncCollections(
        userId,
        changes.collections,
        lastSyncAt,
        conflicts,
      );
    }

    // Process items
    if (changes.items && changes.items.length > 0) {
      syncedItems = await this.syncItems(
        userId,
        changes.items,
        lastSyncAt,
        conflicts,
      );
    }

    // Process tags
    if (changes.tags && changes.tags.length > 0) {
      syncedTags = await this.syncTags(
        userId,
        changes.tags,
        lastSyncAt,
        conflicts,
      );
    }

    return { syncedCollections, syncedItems, syncedTags };
  }

  /**
   * Sync collections with conflict resolution
   */
  private async syncCollections(
    userId: string,
    clientCollections: SyncCollectionDto[],
    lastSyncAt: Date | null,
    conflicts: ConflictDto[],
  ): Promise<number> {
    let synced = 0;

    for (const clientCollection of clientCollections) {
      try {
        const serverCollection = await this.prisma.collection.findUnique({
          where: { id: clientCollection.id },
        });

        if (!serverCollection) {
          // New collection from client
          await this.prisma.collection.create({
            data: {
              id: clientCollection.id,
              userId,
              name: clientCollection.name,
              type: clientCollection.type,
              description: clientCollection.description,
              coverImagePath: clientCollection.coverImagePath,
              coverImageUrl: clientCollection.coverImageUrl,
              itemCount: clientCollection.itemCount,
              version: clientCollection.version,
              isDeleted: clientCollection.isDeleted,
              deletedAt: clientCollection.deletedAt
                ? new Date(clientCollection.deletedAt)
                : null,
              createdAt: new Date(clientCollection.createdAt),
              updatedAt: new Date(clientCollection.updatedAt),
              syncedAt: new Date(),
            },
          });
          synced++;
        } else {
          // Conflict resolution: Last-Write-Wins
          const conflict = this.resolveConflict(
            'collection',
            clientCollection.id,
            serverCollection.version,
            clientCollection.version,
            serverCollection.updatedAt,
            new Date(clientCollection.updatedAt),
          );

          if (conflict) {
            conflicts.push(conflict);
          }

          if (conflict?.resolution === 'client_wins') {
            // Update with client data
            await this.prisma.collection.update({
              where: { id: clientCollection.id },
              data: {
                name: clientCollection.name,
                type: clientCollection.type,
                description: clientCollection.description,
                coverImagePath: clientCollection.coverImagePath,
                coverImageUrl: clientCollection.coverImageUrl,
                itemCount: clientCollection.itemCount,
                version: clientCollection.version,
                isDeleted: clientCollection.isDeleted,
                deletedAt: clientCollection.deletedAt
                  ? new Date(clientCollection.deletedAt)
                  : null,
                updatedAt: new Date(clientCollection.updatedAt),
                syncedAt: new Date(),
              },
            });
            synced++;
          }
          // If server_wins, we don't update (client will get server version)
        }
      } catch (error) {
        this.logger.error(
          `Error syncing collection ${clientCollection.id}:`,
          error,
        );
      }
    }

    return synced;
  }

  /**
   * Sync items with conflict resolution
   */
  private async syncItems(
    userId: string,
    clientItems: SyncItemDto[],
    lastSyncAt: Date | null,
    conflicts: ConflictDto[],
  ): Promise<number> {
    let synced = 0;

    for (const clientItem of clientItems) {
      try {
        const serverItem = await this.prisma.item.findUnique({
          where: { id: clientItem.id },
        });

        if (!serverItem) {
          // New item from client
          await this.prisma.item.create({
            data: {
              id: clientItem.id,
              collectionId: clientItem.collectionId,
              title: clientItem.title,
              barcode: clientItem.barcode,
              coverImageUrl: clientItem.coverImageUrl,
              coverImagePath: clientItem.coverImagePath,
              description: clientItem.description,
              notes: clientItem.notes,
              metadata: clientItem.metadata,
              condition: clientItem.condition,
              purchasePrice: clientItem.purchasePrice,
              purchaseDate: clientItem.purchaseDate
                ? new Date(clientItem.purchaseDate)
                : null,
              currentValue: clientItem.currentValue,
              location: clientItem.location,
              isFavorite: clientItem.isFavorite,
              isWishlist: clientItem.isWishlist,
              sortOrder: clientItem.sortOrder,
              quantity: clientItem.quantity,
              version: clientItem.version,
              isDeleted: clientItem.isDeleted,
              deletedAt: clientItem.deletedAt
                ? new Date(clientItem.deletedAt)
                : null,
              createdAt: new Date(clientItem.createdAt),
              updatedAt: new Date(clientItem.updatedAt),
              syncedAt: new Date(),
            },
          });

          // Sync tags
          if (clientItem.tagIds && clientItem.tagIds.length > 0) {
            await this.syncItemTags(clientItem.id, clientItem.tagIds);
          }

          synced++;
        } else {
          // Conflict resolution
          const conflict = this.resolveConflict(
            'item',
            clientItem.id,
            serverItem.version,
            clientItem.version,
            serverItem.updatedAt,
            new Date(clientItem.updatedAt),
          );

          if (conflict) {
            conflicts.push(conflict);
          }

          if (conflict?.resolution === 'client_wins') {
            await this.prisma.item.update({
              where: { id: clientItem.id },
              data: {
                collectionId: clientItem.collectionId,
                title: clientItem.title,
                barcode: clientItem.barcode,
                coverImageUrl: clientItem.coverImageUrl,
                coverImagePath: clientItem.coverImagePath,
                description: clientItem.description,
                notes: clientItem.notes,
                metadata: clientItem.metadata,
                condition: clientItem.condition,
                purchasePrice: clientItem.purchasePrice,
                purchaseDate: clientItem.purchaseDate
                  ? new Date(clientItem.purchaseDate)
                  : null,
                currentValue: clientItem.currentValue,
                location: clientItem.location,
                isFavorite: clientItem.isFavorite,
                isWishlist: clientItem.isWishlist,
                sortOrder: clientItem.sortOrder,
                quantity: clientItem.quantity,
                version: clientItem.version,
                isDeleted: clientItem.isDeleted,
                deletedAt: clientItem.deletedAt
                  ? new Date(clientItem.deletedAt)
                  : null,
                updatedAt: new Date(clientItem.updatedAt),
                syncedAt: new Date(),
              },
            });

            // Sync tags
            if (clientItem.tagIds !== undefined) {
              await this.syncItemTags(clientItem.id, clientItem.tagIds);
            }

            synced++;
          }
        }
      } catch (error) {
        this.logger.error(`Error syncing item ${clientItem.id}:`, error);
      }
    }

    return synced;
  }

  /**
   * Sync tags with conflict resolution
   */
  private async syncTags(
    userId: string,
    clientTags: SyncTagDto[],
    lastSyncAt: Date | null,
    conflicts: ConflictDto[],
  ): Promise<number> {
    let synced = 0;

    for (const clientTag of clientTags) {
      try {
        const serverTag = await this.prisma.tag.findUnique({
          where: { id: clientTag.id },
        });

        if (!serverTag) {
          // New tag from client
          await this.prisma.tag.create({
            data: {
              id: clientTag.id,
              userId,
              name: clientTag.name,
              color: clientTag.color,
              version: clientTag.version,
              isDeleted: clientTag.isDeleted,
              deletedAt: clientTag.deletedAt
                ? new Date(clientTag.deletedAt)
                : null,
              createdAt: new Date(clientTag.createdAt),
              updatedAt: new Date(clientTag.updatedAt),
              syncedAt: new Date(),
            },
          });
          synced++;
        } else {
          // Conflict resolution
          const conflict = this.resolveConflict(
            'tag',
            clientTag.id,
            serverTag.version,
            clientTag.version,
            serverTag.updatedAt,
            new Date(clientTag.updatedAt),
          );

          if (conflict) {
            conflicts.push(conflict);
          }

          if (conflict?.resolution === 'client_wins') {
            await this.prisma.tag.update({
              where: { id: clientTag.id },
              data: {
                name: clientTag.name,
                color: clientTag.color,
                version: clientTag.version,
                isDeleted: clientTag.isDeleted,
                deletedAt: clientTag.deletedAt
                  ? new Date(clientTag.deletedAt)
                  : null,
                updatedAt: new Date(clientTag.updatedAt),
                syncedAt: new Date(),
              },
            });
            synced++;
          }
        }
      } catch (error) {
        this.logger.error(`Error syncing tag ${clientTag.id}:`, error);
      }
    }

    return synced;
  }

  /**
   * Sync item tags
   */
  private async syncItemTags(itemId: string, tagIds: string[]) {
    // Remove existing tags
    await this.prisma.itemTag.deleteMany({ where: { itemId } });

    // Add new tags
    if (tagIds.length > 0) {
      await this.prisma.itemTag.createMany({
        data: tagIds.map((tagId) => ({ itemId, tagId })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * Resolve conflict using Last-Write-Wins strategy
   */
  private resolveConflict(
    entityType: 'collection' | 'item' | 'tag',
    entityId: string,
    serverVersion: number,
    clientVersion: number,
    serverUpdatedAt: Date,
    clientUpdatedAt: Date,
  ): ConflictDto | null {
    // No conflict if versions match
    if (serverVersion === clientVersion) {
      return null;
    }

    // Higher version wins
    if (clientVersion > serverVersion) {
      return {
        entityType,
        entityId,
        resolution: 'client_wins',
        serverVersion,
        clientVersion,
        reason: `Client version (${clientVersion}) > Server version (${serverVersion})`,
      };
    }

    if (serverVersion > clientVersion) {
      return {
        entityType,
        entityId,
        resolution: 'server_wins',
        serverVersion,
        clientVersion,
        reason: `Server version (${serverVersion}) > Client version (${clientVersion})`,
      };
    }

    // If versions are equal but we got here, use timestamp as tiebreaker
    if (clientUpdatedAt > serverUpdatedAt) {
      return {
        entityType,
        entityId,
        resolution: 'client_wins',
        serverVersion,
        clientVersion,
        reason: `Client timestamp (${clientUpdatedAt.toISOString()}) > Server timestamp (${serverUpdatedAt.toISOString()})`,
      };
    }

    return {
      entityType,
      entityId,
      resolution: 'server_wins',
      serverVersion,
      clientVersion,
      reason: `Server timestamp (${serverUpdatedAt.toISOString()}) >= Client timestamp (${clientUpdatedAt.toISOString()})`,
    };
  }

  /**
   * Get all server collections
   */
  private async getServerCollections(
    userId: string,
  ): Promise<SyncCollectionDto[]> {
    const collections = await this.prisma.collection.findMany({
      where: { userId },
    });

    return collections.map(this.mapCollectionToDto);
  }

  /**
   * Get server collections since lastSyncAt
   */
  private async getServerCollectionsSince(
    userId: string,
    lastSyncAt: Date,
  ): Promise<SyncCollectionDto[]> {
    const collections = await this.prisma.collection.findMany({
      where: {
        userId,
        updatedAt: { gt: lastSyncAt },
      },
    });

    return collections.map(this.mapCollectionToDto);
  }

  /**
   * Get all server items
   */
  private async getServerItems(userId: string): Promise<SyncItemDto[]> {
    const items = await this.prisma.item.findMany({
      where: {
        collection: { userId },
      },
      include: {
        itemTags: {
          select: {
            tagId: true,
          },
        },
      },
    });

    return items.map(this.mapItemToDto);
  }

  /**
   * Get server items since lastSyncAt
   */
  private async getServerItemsSince(
    userId: string,
    lastSyncAt: Date,
  ): Promise<SyncItemDto[]> {
    const items = await this.prisma.item.findMany({
      where: {
        collection: { userId },
        updatedAt: { gt: lastSyncAt },
      },
      include: {
        itemTags: {
          select: {
            tagId: true,
          },
        },
      },
    });

    return items.map(this.mapItemToDto);
  }

  /**
   * Get all server tags
   */
  private async getServerTags(userId: string): Promise<SyncTagDto[]> {
    const tags = await this.prisma.tag.findMany({
      where: { userId },
    });

    return tags.map(this.mapTagToDto);
  }

  /**
   * Get server tags since lastSyncAt
   */
  private async getServerTagsSince(
    userId: string,
    lastSyncAt: Date,
  ): Promise<SyncTagDto[]> {
    const tags = await this.prisma.tag.findMany({
      where: {
        userId,
        updatedAt: { gt: lastSyncAt },
      },
    });

    return tags.map(this.mapTagToDto);
  }

  /**
   * Map Prisma collection to DTO
   */
  private mapCollectionToDto(collection: any): SyncCollectionDto {
    return {
      id: collection.id,
      name: collection.name,
      type: collection.type,
      description: collection.description,
      coverImagePath: collection.coverImagePath,
      coverImageUrl: collection.coverImageUrl,
      itemCount: collection.itemCount,
      version: collection.version,
      isDeleted: collection.isDeleted,
      deletedAt: collection.deletedAt?.toISOString(),
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
    };
  }

  /**
   * Map Prisma item to DTO
   */
  private mapItemToDto(item: any): SyncItemDto {
    return {
      id: item.id,
      collectionId: item.collectionId,
      title: item.title,
      barcode: item.barcode,
      coverImageUrl: item.coverImageUrl,
      coverImagePath: item.coverImagePath,
      description: item.description,
      notes: item.notes,
      metadata: item.metadata,
      condition: item.condition,
      purchasePrice: item.purchasePrice,
      purchaseDate: item.purchaseDate?.toISOString(),
      currentValue: item.currentValue,
      location: item.location,
      isFavorite: item.isFavorite,
      isWishlist: item.isWishlist,
      sortOrder: item.sortOrder,
      quantity: item.quantity,
      version: item.version,
      isDeleted: item.isDeleted,
      deletedAt: item.deletedAt?.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      tagIds: item.itemTags?.map((it: any) => it.tagId),
    };
  }

  /**
   * Map Prisma tag to DTO
   */
  private mapTagToDto(tag: any): SyncTagDto {
    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      version: tag.version,
      isDeleted: tag.isDeleted,
      deletedAt: tag.deletedAt?.toISOString(),
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString(),
    };
  }

  /**
   * Log sync operation
   */
  private async logSync(
    userId: string,
    deviceId: string,
    syncType: SyncType,
    collectionsCount: number,
    itemsCount: number,
    tagsCount: number,
    conflictsResolved: number,
    startedAt: number,
    durationMs: number,
  ) {
    await this.prisma.syncLog.create({
      data: {
        userId,
        deviceId,
        syncType,
        direction: 'bidirectional',
        collectionsCount,
        itemsCount,
        tagsCount,
        conflictsResolved,
        startedAt: new Date(startedAt),
        completedAt: new Date(),
        durationMs,
        status: 'success',
      },
    });
  }
}
