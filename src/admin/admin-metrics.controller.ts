import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '@/common/decorators/admin.decorator';
import { AdminGuard } from '@/common/guards/admin.guard';
import { AdminService } from './admin.service';
import { AdminMetricsQueryDto } from './dto/admin-metrics.dto';
import type { Response } from 'express';

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

  @Get('overview/export.json')
  @ApiOperation({ summary: 'Export dashboard overview metrics as JSON' })
  @ApiResponse({ status: 200, description: 'JSON export generated' })
  async exportOverview(
    @Query() query: AdminMetricsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { filename, json } =
      await this.adminService.exportDashboardOverviewJson(query);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return json;
  }
}
