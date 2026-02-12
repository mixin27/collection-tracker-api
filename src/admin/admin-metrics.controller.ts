import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '@/common/decorators/admin.decorator';
import { AdminGuard } from '@/common/guards/admin.guard';
import { AdminService } from './admin.service';
import { AdminMetricsQueryDto } from './dto/admin-metrics.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@AdminOnly()
@Controller('admin/metrics')
export class AdminMetricsController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Dashboard overview metrics (users, subscriptions, activity, webhook volume, entitlements)',
  })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getOverview(@Query() query: AdminMetricsQueryDto) {
    return this.adminService.getDashboardOverview(query);
  }

  @Get('cards')
  @ApiOperation({
    summary:
      'Compact dashboard cards payload (fixed keys for admin widgets)',
  })
  @ApiResponse({ status: 200, description: 'Dashboard cards payload' })
  async getCards(@Query() query: AdminMetricsQueryDto) {
    return this.adminService.getDashboardCards(query);
  }
}
