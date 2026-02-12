import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SubscriptionTier } from '@/generated/prisma/enums';

export class AdminListUsersQueryDto {
  @ApiProperty({ required: false, example: 'john@example.com' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ required: false, enum: SubscriptionTier })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  tier?: SubscriptionTier;

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

export class AdminUpdateUserTierDto {
  @ApiProperty({ enum: SubscriptionTier })
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @ApiProperty({
    required: false,
    default: true,
    description: 'Apply configured limits for target tier',
  })
  @IsOptional()
  @IsBoolean()
  applyTierLimits?: boolean;
}

export class AdminUpdateUserLimitsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(-1)
  maxCollections?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(-1)
  maxItemsPerCollection?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(-1)
  maxTags?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDevices?: number;
}
