import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePriceHistoryDto {
  @ApiProperty({ example: 24.99 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 'manual', required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ example: 'Price seen in local market', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: '2026-02-12T10:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}

export class PriceHistoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  itemId: string;

  @ApiProperty()
  price: number;

  @ApiProperty({ nullable: true })
  source: string | null;

  @ApiProperty({ nullable: true })
  notes: string | null;

  @ApiProperty()
  recordedAt: Date;
}
