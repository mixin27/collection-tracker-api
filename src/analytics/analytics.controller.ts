import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  ActivityQueryDto,
  AdminActivitySummaryQueryDto,
  TrackActivityDto,
} from './dto/analytics.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AdminOnly } from '@/common/decorators/admin.decorator';
import { AdminGuard } from '@/common/guards/admin.guard';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  @ApiOperation({ summary: 'Track a user activity event' })
  @ApiResponse({ status: 201, description: 'Event tracked' })
  async trackActivity(
    @CurrentUser('userId') userId: string,
    @Body() dto: TrackActivityDto,
  ) {
    return this.analyticsService.trackActivity(userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user activity history' })
  @ApiResponse({ status: 200, description: 'User activity list' })
  async getMyActivities(
    @CurrentUser('userId') userId: string,
    @Query() query: ActivityQueryDto,
  ) {
    return this.analyticsService.getMyActivities(userId, query);
  }

  @Get('admin/summary')
  @UseGuards(AdminGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Admin analytics summary (events/users/top actions)' })
  @ApiResponse({ status: 200, description: 'Analytics summary' })
  async getAdminSummary(@Query() query: AdminActivitySummaryQueryDto) {
    return this.analyticsService.getAdminActivitySummary(query);
  }
}
