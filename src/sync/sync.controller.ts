import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SyncRequestDto, SyncResponseDto, SyncStatusDto } from './dto/sync.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('sync')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('full')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Full synchronization',
    description:
      'Performs a complete sync of all data. Use for initial sync or after extended offline period.',
  })
  @ApiResponse({
    status: 200,
    description: 'Full sync completed successfully',
    type: SyncResponseDto,
  })
  async fullSync(
    @CurrentUser('userId') userId: string,
    @Body() syncRequestDto: SyncRequestDto,
  ): Promise<SyncResponseDto> {
    return this.syncService.fullSync(userId, syncRequestDto);
  }

  @Post('incremental')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Incremental synchronization',
    description:
      'Syncs only changes since last sync. Requires lastSyncAt timestamp.',
  })
  @ApiResponse({
    status: 200,
    description: 'Incremental sync completed successfully',
    type: SyncResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'lastSyncAt is required for incremental sync',
  })
  async incrementalSync(
    @CurrentUser('userId') userId: string,
    @Body() syncRequestDto: SyncRequestDto,
  ): Promise<SyncResponseDto> {
    return this.syncService.incrementalSync(userId, syncRequestDto);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get sync status',
    description: 'Returns information about last sync and sync history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync status retrieved successfully',
    type: SyncStatusDto,
  })
  async getSyncStatus(@CurrentUser('userId') userId: string) {
    return this.syncService.getSyncStatus(userId);
  }
}
