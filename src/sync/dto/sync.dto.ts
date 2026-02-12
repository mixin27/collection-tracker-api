import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// ============================================
// ENTITY DTOs FOR SYNC
// ============================================

export class SyncCollectionDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coverImagePath?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiProperty()
  @IsInt()
  itemCount: number;

  @ApiProperty()
  @IsInt()
  version: number;

  @ApiProperty()
  @IsBoolean()
  isDeleted: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  deletedAt?: string;

  @ApiProperty()
  @IsDateString()
  createdAt: string;

  @ApiProperty()
  @IsDateString()
  updatedAt: string;
}

export class SyncItemDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsUUID()
  collectionId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coverImagePath?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metadata?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  purchasePrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  currentValue?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty()
  @IsBoolean()
  isFavorite: boolean;

  @ApiProperty()
  @IsBoolean()
  isWishlist: boolean;

  @ApiProperty()
  @IsInt()
  sortOrder: number;

  @ApiProperty()
  @IsInt()
  quantity: number;

  @ApiProperty()
  @IsInt()
  version: number;

  @ApiProperty()
  @IsBoolean()
  isDeleted: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  deletedAt?: string;

  @ApiProperty()
  @IsDateString()
  createdAt: string;

  @ApiProperty()
  @IsDateString()
  updatedAt: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  tagIds?: string[];
}

export class SyncTagDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty()
  @IsInt()
  version: number;

  @ApiProperty()
  @IsBoolean()
  isDeleted: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  deletedAt?: string;

  @ApiProperty()
  @IsDateString()
  createdAt: string;

  @ApiProperty()
  @IsDateString()
  updatedAt: string;
}

// ============================================
// SYNC REQUEST/RESPONSE DTOs
// ============================================

export class ClientChangesDto {
  @ApiProperty({ type: [SyncCollectionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncCollectionDto)
  collections?: SyncCollectionDto[];

  @ApiProperty({ type: [SyncItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncItemDto)
  items?: SyncItemDto[];

  @ApiProperty({ type: [SyncTagDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncTagDto)
  tags?: SyncTagDto[];
}

export class SyncRequestDto {
  @ApiProperty({ example: 'device-uuid-123' })
  @IsString()
  deviceId: string;

  @ApiProperty({ example: '2025-02-01T12:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  lastSyncAt?: string;

  @ApiProperty({ type: ClientChangesDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClientChangesDto)
  changes?: ClientChangesDto;
}

export class ConflictDto {
  @ApiProperty({ example: 'collection' })
  entityType: 'collection' | 'item' | 'tag';

  @ApiProperty()
  entityId: string;

  @ApiProperty({ example: 'server_wins' })
  resolution: 'server_wins' | 'client_wins';

  @ApiProperty()
  serverVersion: number;

  @ApiProperty()
  clientVersion: number;

  @ApiProperty()
  reason: string;
}

export class ServerChangesDto {
  @ApiProperty({ type: [SyncCollectionDto] })
  collections: SyncCollectionDto[];

  @ApiProperty({ type: [SyncItemDto] })
  items: SyncItemDto[];

  @ApiProperty({ type: [SyncTagDto] })
  tags: SyncTagDto[];
}

export class SyncResponseDto {
  @ApiProperty({ type: ServerChangesDto })
  serverChanges: ServerChangesDto;

  @ApiProperty({ type: [ConflictDto] })
  conflicts: ConflictDto[];

  @ApiProperty()
  lastSyncAt: string;

  @ApiProperty()
  syncedCollections: number;

  @ApiProperty()
  syncedItems: number;

  @ApiProperty()
  syncedTags: number;

  @ApiProperty()
  conflictsResolved: number;
}

export class SyncStatusDto {
  @ApiProperty()
  lastSyncAt: string | null;

  @ApiProperty()
  totalSyncs: number;

  @ApiProperty()
  lastSyncDuration: number | null;

  @ApiProperty()
  pendingChanges: boolean;
}
