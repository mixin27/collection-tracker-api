import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCollectionDto {
  @ApiProperty({
    example: 'uuid-from-mobile',
    description: 'UUID generated on mobile device',
  })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'My Book Collection', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'book' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'Collection of my favorite books', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '/local/path/cover.jpg', required: false })
  @IsOptional()
  @IsString()
  coverImagePath?: string;

  @ApiProperty({ example: 'https://s3.../cover.jpg', required: false })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;
}

export class UpdateCollectionDto {
  @ApiProperty({ example: 'Updated Collection Name', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'book', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '/local/path/new-cover.jpg', required: false })
  @IsOptional()
  @IsString()
  coverImagePath?: string;

  @ApiProperty({ example: 'https://s3.../new-cover.jpg', required: false })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsInt()
  itemCount?: number;
}

export class CollectionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  description: string | null;

  @ApiProperty()
  coverImagePath: string | null;

  @ApiProperty()
  coverImageUrl: string | null;

  @ApiProperty()
  itemCount: number;

  @ApiProperty()
  version: number;

  @ApiProperty()
  isDeleted: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CollectionListResponseDto {
  @ApiProperty({ type: [CollectionResponseDto] })
  collections: CollectionResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  hasMore: boolean;
}
