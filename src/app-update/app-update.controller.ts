import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { AppUpdateService } from './app-update.service';
import { AppUpdateCheckQueryDto } from './dto/app-update.dto';

@ApiTags('app')
@Controller('app')
export class AppUpdateController {
  constructor(private readonly appUpdateService: AppUpdateService) {}

  @Public()
  @Get('update-check')
  @ApiOperation({ summary: 'Check app update availability by platform/version' })
  @ApiResponse({ status: 200, description: 'Update check result' })
  async checkUpdate(@Query() query: AppUpdateCheckQueryDto) {
    return this.appUpdateService.checkUpdate(
      query.platform,
      query.currentVersion,
    );
  }
}
