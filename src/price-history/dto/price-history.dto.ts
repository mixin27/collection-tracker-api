import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePriceHistoryDto {
  @ApiProperty({ example: 24.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ required: false, example: 'manual' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @ApiProperty({ required: false, example: 'Observed at local store' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ required: false, example: '2026-02-12T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}

export class UpdatePriceHistoryDto {
  @ApiProperty({ required: false, example: 29.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ required: false, example: 'market' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @ApiProperty({ required: false, example: 'Corrected from old value' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ required: false, example: '2026-02-13T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
