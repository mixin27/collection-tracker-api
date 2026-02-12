import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateItemDto {
  @ApiProperty({ example: 'uuid-from-mobile' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'collection-uuid' })
  @IsUUID()
  collectionId: string;

  @ApiProperty({ example: 'The Great Gatsby', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: '9780743273565', required: false })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 'https://example.com/cover.jpg', required: false })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiProperty({ example: '/local/path/cover.jpg', required: false })
  @IsOptional()
  @IsString()
  coverImagePath?: string;

  @ApiProperty({ example: 'Classic American novel', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'My personal notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    example: '{"author":"F. Scott Fitzgerald","year":1925}',
    required: false,
  })
  @IsOptional()
  @IsString()
  metadata?: string;

  @ApiProperty({ example: 'Excellent', required: false })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiProperty({ example: 15.99, required: false })
  @IsOptional()
  @IsNumber()
  purchasePrice?: number;

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiProperty({ example: 25.0, required: false })
  @IsOptional()
  @IsNumber()
  currentValue?: number;

  @ApiProperty({ example: 'Shelf A, Row 3', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isWishlist?: boolean;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiProperty({
    example: ['tag-uuid-1', 'tag-uuid-2'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsUUID('all', { each: true })
  tagIds?: string[];
}

export class UpdateItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

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
  @IsNumber()
  purchasePrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  currentValue?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isWishlist?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}

export class ItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  collectionId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  barcode: string | null;

  @ApiProperty()
  coverImageUrl: string | null;

  @ApiProperty()
  coverImagePath: string | null;

  @ApiProperty()
  description: string | null;

  @ApiProperty()
  notes: string | null;

  @ApiProperty()
  metadata: string | null;

  @ApiProperty()
  condition: string | null;

  @ApiProperty()
  purchasePrice: number | null;

  @ApiProperty()
  purchaseDate: Date | null;

  @ApiProperty()
  currentValue: number | null;

  @ApiProperty()
  location: string | null;

  @ApiProperty()
  isFavorite: boolean;

  @ApiProperty()
  isWishlist: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  version: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  itemTags?: any[];
}

export class ItemListResponseDto {
  @ApiProperty({ type: [ItemResponseDto] })
  items: ItemResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  hasMore: boolean;
}
