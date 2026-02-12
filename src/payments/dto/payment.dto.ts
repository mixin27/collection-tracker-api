import { ApiProperty } from '@nestjs/swagger';
import { PaymentPlatform } from '@/generated/prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class VerifyPurchaseDto {
  @ApiProperty({ enum: PaymentPlatform })
  @IsEnum(PaymentPlatform)
  platform: PaymentPlatform;

  @ApiProperty({ example: 'premium_monthly' })
  @IsString()
  @MinLength(1)
  productId: string;

  @ApiProperty({ required: false, example: 'google-purchase-token' })
  @ValidateIf((o: VerifyPurchaseDto) => o.platform === PaymentPlatform.GOOGLE_PLAY)
  @IsString()
  @MinLength(1)
  purchaseToken?: string;

  @ApiProperty({ required: false, example: '2000001234567890' })
  @ValidateIf((o: VerifyPurchaseDto) => o.platform === PaymentPlatform.APPLE_STORE)
  @IsString()
  @MinLength(1)
  transactionId?: string;
}

export class PaymentWebhookDto {
  @ApiProperty({ required: false, description: 'Google Pub/Sub push envelope' })
  @IsOptional()
  message?: {
    data?: string;
    messageId?: string;
  };

  @ApiProperty({ required: false, description: 'Apple signed payload JWS' })
  @IsOptional()
  @IsString()
  signedPayload?: string;
}
