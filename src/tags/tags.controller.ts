import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TagsService } from './tags.service';
import {
  CreateTagDto,
  UpdateTagDto,
  TagResponseDto,
  TagListResponseDto,
} from './dto/tag.dto';
import {
  type AuthUserLimits,
  CurrentUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('tags')
@ApiBearerAuth()
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({
    status: 201,
    description: 'Tag created successfully',
    type: TagResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Tag limit reached' })
  @ApiResponse({
    status: 409,
    description: 'Tag with this name already exists',
  })
  async create(
    @CurrentUser('userId') userId: string,
    @CurrentUser('limits') limits: AuthUserLimits,
    @Body() createTagDto: CreateTagDto,
  ) {
    return this.tagsService.create(userId, createTagDto, limits.maxTags);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tags for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of tags',
    type: TagListResponseDto,
  })
  async findAll(@CurrentUser('userId') userId: string) {
    return this.tagsService.findAll(userId);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular tags for suggestions' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Popular tags' })
  async getPopular(@Query('limit') limit?: number) {
    return this.tagsService.getPopular(limit ? +limit : 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tag by ID' })
  @ApiResponse({
    status: 200,
    description: 'Tag details',
    type: TagResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.tagsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiResponse({
    status: 200,
    description: 'Tag updated successfully',
    type: TagResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @ApiResponse({
    status: 409,
    description: 'Tag with this name already exists',
  })
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() updateTagDto: UpdateTagDto,
  ) {
    return this.tagsService.update(userId, id, updateTagDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tag (soft delete)' })
  @ApiResponse({ status: 204, description: 'Tag deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async remove(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    await this.tagsService.remove(userId, id);
  }
}
