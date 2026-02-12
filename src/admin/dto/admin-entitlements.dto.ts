import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateTrialConfigDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: 14 })
  @IsInt()
  @Min(0)
  days: number;

  @ApiProperty({ example: 'PREMIUM', enum: ['FREE', 'PREMIUM', 'ULTIMATE'] })
  @IsIn(['FREE', 'PREMIUM', 'ULTIMATE'])
  tier: 'FREE' | 'PREMIUM' | 'ULTIMATE';
}

export class UpdateGlobalFreeConfigDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: 'PREMIUM', enum: ['FREE', 'PREMIUM', 'ULTIMATE'] })
  @IsIn(['FREE', 'PREMIUM', 'ULTIMATE'])
  tier: 'FREE' | 'PREMIUM' | 'ULTIMATE';

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  startAt?: string | null;

  @ApiProperty({ example: '2026-03-07T23:59:59.999Z', required: false })
  @IsOptional()
  @IsDateString()
  endAt?: string | null;
}
