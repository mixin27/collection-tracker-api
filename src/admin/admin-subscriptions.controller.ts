import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '@/common/decorators/admin.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AdminGuard } from '@/common/guards/admin.guard';
import { AdminService } from './admin.service';
import {
  AdminListSubscriptionsQueryDto,
  AdminUpdateSubscriptionDto,
} from './dto/admin-subscriptions.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@AdminOnly()
@Controller('admin/subscriptions')
export class AdminSubscriptionsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'List subscriptions with admin filters' })
  @ApiResponse({ status: 200, description: 'Subscription list' })
  async listSubscriptions(@Query() query: AdminListSubscriptionsQueryDto) {
    return this.adminService.listSubscriptions(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Manually update a subscription record' })
  @ApiResponse({ status: 200, description: 'Subscription updated' })
  async updateSubscription(
    @CurrentUser('userId') adminUserId: string,
    @Param('id') id: string,
    @Body() dto: AdminUpdateSubscriptionDto,
  ) {
    return this.adminService.updateSubscription(adminUserId, id, dto);
  }
}
