import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '@/common/decorators/admin.decorator';
import { AdminGuard } from '@/common/guards/admin.guard';
import { AdminService } from './admin.service';
import { AdminAuditQueryDto } from './dto/admin-audit.dto';
import type { Response } from 'express';

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

  @Get('export.csv')
  @ApiOperation({ summary: 'Export admin audit logs as CSV' })
  @ApiResponse({ status: 200, description: 'CSV export generated' })
  async exportAuditCsv(
    @Query() query: AdminAuditQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { csv, filename } = await this.adminService.exportAdminAuditCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }
}
