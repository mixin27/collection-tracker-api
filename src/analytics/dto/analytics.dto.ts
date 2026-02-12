import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class TrackActivityDto {
  @ApiProperty({ example: 'item_added' })
  @IsString()
  @MaxLength(100)
  action: string;

  @ApiProperty({ required: false, example: 'item' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @ApiProperty({ required: false, example: 'item-uuid' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  entityId?: string;

  @ApiProperty({ required: false, example: '{"source":"mobile"}' })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({ required: false, example: 'iOS 18 - iPhone 16' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceInfo?: string;
}

export class ActivityQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiProperty({ required: false, example: 'item_added' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class AdminActivitySummaryQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiProperty({ required: false, default: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  top?: number;
}
