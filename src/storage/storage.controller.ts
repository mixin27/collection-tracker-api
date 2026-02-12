import { Body, Controller, Delete, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { StorageService } from './storage.service';
import {
  CreatePresignedUrlDto,
  DeleteFileResponseDto,
  PresignedUrlResponseDto,
} from './dto/storage.dto';

@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presigned-url')
  @ApiOperation({ summary: 'Create pre-signed S3 upload URL' })
  @ApiResponse({
    status: 201,
    description: 'Pre-signed URL generated',
    type: PresignedUrlResponseDto,
  })
  async createPresignedUrl(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePresignedUrlDto,
  ) {
    return this.storageService.createPresignedUploadUrl(userId, dto);
  }

  @Delete(':key')
  @ApiOperation({
    summary: 'Delete file by storage key (URL-encoded key when using path param)',
  })
  @ApiParam({ name: 'key', description: 'S3 object key' })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
    type: DeleteFileResponseDto,
  })
  async deleteFileByParam(
    @CurrentUser('userId') userId: string,
    @Param('key') key: string,
  ) {
    const decodedKey = decodeURIComponent(key);
    return this.storageService.deleteFile(userId, decodedKey);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete file by storage key (query string variant)' })
  @ApiQuery({ name: 'key', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
    type: DeleteFileResponseDto,
  })
  async deleteFileByQuery(
    @CurrentUser('userId') userId: string,
    @Query('key') key: string,
  ) {
    const decodedKey = decodeURIComponent(key);
    return this.storageService.deleteFile(userId, decodedKey);
  }
}
