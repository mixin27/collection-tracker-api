import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { SessionsService } from './sessions.service';
import { AdminOnly } from '@/common/decorators/admin.decorator';
import { AdminGuard } from '@/common/guards/admin.guard';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List active sessions for current user' })
  @ApiResponse({ status: 200, description: 'Session list' })
  async listMySessions(@CurrentUser('userId') userId: string) {
    return this.sessionsService.listMySessions(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  async revokeSession(
    @CurrentUser('userId') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.sessionsService.revokeSession(userId, sessionId);
  }

  @Post('revoke-others')
  @ApiOperation({ summary: 'Revoke all sessions except current one' })
  @ApiResponse({ status: 200, description: 'Other sessions revoked' })
  async revokeOthers(
    @CurrentUser('userId') userId: string,
    @CurrentUser('sessionId') currentSessionId?: string,
  ) {
    return this.sessionsService.revokeOtherSessions(userId, currentSessionId);
  }

  @Post('admin/cleanup-expired')
  @UseGuards(AdminGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: clean up expired sessions' })
  @ApiResponse({ status: 200, description: 'Expired sessions cleaned' })
  async cleanupExpired(@Body() _body: Record<string, never>) {
    return this.sessionsService.cleanupExpiredSessions();
  }
}
