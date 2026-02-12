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
import { CollectionService } from './collection.service';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
  CollectionResponseDto,
  CollectionListResponseDto,
} from './dto/collection.dto';
import {
  type AuthUserLimits,
  CurrentUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('collections')
@ApiBearerAuth()
@Controller('collections')
export class CollectionController {
  constructor(private readonly collectionsService: CollectionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new collection' })
  @ApiResponse({
    status: 201,
    description: 'Collection created successfully',
    type: CollectionResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Collection limit reached' })
  async create(
    @CurrentUser('userId') userId: string,
    @CurrentUser('limits') limits: AuthUserLimits,
    @Body() createCollectionDto: CreateCollectionDto,
  ) {
    return this.collectionsService.create(
      userId,
      createCollectionDto,
      limits.maxCollections,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all collections for current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of collections',
    type: CollectionListResponseDto,
  })
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.collectionsService.findAll(
      userId,
      limit ? +limit : 50,
      offset ? +offset : 0,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get collection statistics' })
  @ApiResponse({ status: 200, description: 'Collection statistics' })
  async getStats(@CurrentUser('userId') userId: string) {
    return this.collectionsService.getStats(userId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search collections' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @CurrentUser('userId') userId: string,
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.collectionsService.search(userId, query, limit ? +limit : 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a collection by ID' })
  @ApiResponse({
    status: 200,
    description: 'Collection details',
    type: CollectionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.collectionsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a collection' })
  @ApiResponse({
    status: 200,
    description: 'Collection updated successfully',
    type: CollectionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() updateCollectionDto: UpdateCollectionDto,
  ) {
    return this.collectionsService.update(userId, id, updateCollectionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a collection (soft delete)' })
  @ApiResponse({ status: 204, description: 'Collection deleted successfully' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async remove(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    await this.collectionsService.remove(userId, id);
  }
}
