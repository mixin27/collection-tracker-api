import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  PaymentPlatform,
  SubscriptionStatus,
  SubscriptionTier,
} from '@/generated/prisma/client';

export class AdminListSubscriptionsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ required: false, enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiProperty({ required: false, enum: PaymentPlatform })
  @IsOptional()
  @IsEnum(PaymentPlatform)
  platform?: PaymentPlatform;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class AdminUpdateSubscriptionDto {
  @ApiProperty({ required: false, enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiProperty({ required: false, enum: SubscriptionTier })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  tier?: SubscriptionTier;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  autoRenewing?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productId?: string;
}
