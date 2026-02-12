import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { PaymentPlatform } from '@/generated/prisma/client';
import { PaymentWebhookDto, VerifyPurchaseDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('verify')
  @ApiOperation({ summary: 'Verify an in-app subscription purchase' })
  @ApiResponse({ status: 201, description: 'Purchase verified' })
  async verifyPurchase(
    @CurrentUser('userId') userId: string,
    @Body() dto: VerifyPurchaseDto,
  ) {
    return this.paymentsService.verifyPurchase(userId, dto);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get current user subscription history' })
  @ApiResponse({ status: 200, description: 'Subscription list' })
  async getSubscriptions(@CurrentUser('userId') userId: string) {
    return this.paymentsService.getUserSubscriptions(userId);
  }

  @Public()
  @Post('webhook/:platform')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'platform',
    enum: ['google', 'apple'],
    description: 'Webhook provider platform',
  })
  @ApiOperation({ summary: 'Handle subscription webhooks from app stores' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhookByPlatform(
    @Param('platform') platform: 'google' | 'apple',
    @Body() payload: PaymentWebhookDto,
    @Headers('x-webhook-secret') secret?: string,
    @Headers('authorization') authorization?: string,
  ) {
    if (platform === 'google') {
      return this.paymentsService.handleGoogleWebhook(
        payload,
        secret,
        authorization,
      );
    }
    return this.paymentsService.handleAppleWebhook(payload, secret);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Handle webhooks (platform inferred from payload shape: signedPayload=apple, message.data=google)',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Body() payload: PaymentWebhookDto,
    @Headers('x-webhook-secret') secret?: string,
    @Headers('authorization') authorization?: string,
  ) {
    if (payload.signedPayload) {
      return this.paymentsService.handleAppleWebhook(payload, secret);
    }
    if (payload.message?.data) {
      return this.paymentsService.handleGoogleWebhook(
        payload,
        secret,
        authorization,
      );
    }

    return {
      processed: false,
      reason: 'unknown_payload_shape',
      expected: {
        google: 'message.data',
        apple: 'signedPayload',
      },
      supportedPlatforms: Object.values(PaymentPlatform),
    };
  }
}
