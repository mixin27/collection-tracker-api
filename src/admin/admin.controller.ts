import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AdminOnly } from '@/common/decorators/admin.decorator';
import { AdminGuard } from '@/common/guards/admin.guard';
import { AdminService } from './admin.service';
import {
  UpdateGlobalFreeConfigDto,
  UpdateTrialConfigDto,
} from './dto/admin-entitlements.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@AdminOnly()
@Controller('admin/config')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('entitlements')
  @ApiOperation({ summary: 'Get trial and global free-access entitlement config' })
  @ApiResponse({ status: 200, description: 'Entitlement config returned' })
  async getEntitlementsConfig() {
    return this.adminService.getEntitlementsConfig();
  }

  @Patch('trial')
  @ApiOperation({ summary: 'Update trial configuration override' })
  @ApiResponse({ status: 200, description: 'Trial config updated' })
  async updateTrialConfig(
    @CurrentUser('userId') adminUserId: string,
    @Body() dto: UpdateTrialConfigDto,
  ) {
    return this.adminService.updateTrialConfig(adminUserId, dto);
  }

  @Patch('global-free')
  @ApiOperation({ summary: 'Update global free-access window override' })
  @ApiResponse({ status: 200, description: 'Global free config updated' })
  async updateGlobalFreeConfig(
    @CurrentUser('userId') adminUserId: string,
    @Body() dto: UpdateGlobalFreeConfigDto,
  ) {
    return this.adminService.updateGlobalFreeConfig(adminUserId, dto);
  }
}
