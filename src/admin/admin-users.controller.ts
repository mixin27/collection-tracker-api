import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '@/common/decorators/admin.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AdminGuard } from '@/common/guards/admin.guard';
import { AdminService } from './admin.service';
import {
  AdminListUsersQueryDto,
  AdminUpdateUserLimitsDto,
  AdminUpdateUserTierDto,
} from './dto/admin-users.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@AdminOnly()
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'List users with search/filter/pagination' })
  @ApiResponse({ status: 200, description: 'User list' })
  async listUsers(@Query() query: AdminListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user profile + subscription summary for admin view' })
  @ApiResponse({ status: 200, description: 'User details' })
  async getUserDetails(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Patch(':id/subscription-tier')
  @ApiOperation({ summary: 'Set user subscription tier manually' })
  @ApiResponse({ status: 200, description: 'User tier updated' })
  async updateUserTier(
    @CurrentUser('userId') adminUserId: string,
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserTierDto,
  ) {
    return this.adminService.updateUserTier(adminUserId, id, dto);
  }

  @Patch(':id/limits')
  @ApiOperation({ summary: 'Update user limits manually' })
  @ApiResponse({ status: 200, description: 'User limits updated' })
  async updateUserLimits(
    @CurrentUser('userId') adminUserId: string,
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserLimitsDto,
  ) {
    return this.adminService.updateUserLimits(adminUserId, id, dto);
  }
}
