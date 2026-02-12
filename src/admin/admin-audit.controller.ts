import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '@/common/decorators/admin.decorator';
import { AdminGuard } from '@/common/guards/admin.guard';
import { AdminService } from './admin.service';
import { AdminAuditQueryDto } from './dto/admin-audit.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@AdminOnly()
@Controller('admin/audit')
export class AdminAuditController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get admin action audit logs' })
  @ApiResponse({ status: 200, description: 'Audit log list' })
  async getAuditLogs(@Query() query: AdminAuditQueryDto) {
    return this.adminService.getAdminAuditLogs(query);
  }
}
