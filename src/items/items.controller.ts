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
import { ItemsService } from './items.service';
import {
  CreateItemDto,
  UpdateItemDto,
  ItemResponseDto,
  ItemListResponseDto,
} from './dto/item.dto';
import {
  CreatePriceHistoryDto,
  PriceHistoryResponseDto,
} from './dto/price-history.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('items')
@ApiBearerAuth()
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new item' })
  @ApiResponse({
    status: 201,
    description: 'Item created successfully',
    type: ItemResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Item limit reached for collection',
  })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async create(
    @CurrentUser('userId') userId: string,
    @CurrentUser('limits') limits: any,
    @Body() createItemDto: CreateItemDto,
  ) {
    return this.itemsService.create(
      userId,
      createItemDto,
      limits.maxItemsPerCollection,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all items' })
  @ApiQuery({ name: 'collectionId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'isFavorite', required: false, type: Boolean })
  @ApiQuery({ name: 'isWishlist', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'List of items',
    type: ItemListResponseDto,
  })
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query('collectionId') collectionId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('isFavorite') isFavorite?: boolean,
    @Query('isWishlist') isWishlist?: boolean,
    @Query('search') search?: string,
  ) {
    return this.itemsService.findAll(
      userId,
      collectionId,
      limit ? +limit : 50,
      offset ? +offset : 0,
      {
        isFavorite: isFavorite !== undefined ? isFavorite === true : undefined,
        isWishlist: isWishlist !== undefined ? isWishlist === true : undefined,
        search,
      },
    );
  }

  @Post(':id/price-history')
  @ApiOperation({ summary: 'Add price history entry for an item' })
  @ApiResponse({
    status: 201,
    description: 'Price history entry created',
    type: PriceHistoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async createPriceHistory(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CreatePriceHistoryDto,
  ) {
    return this.itemsService.createPriceHistory(userId, id, dto);
  }

  @Get(':id/price-history')
  @ApiOperation({ summary: 'Get price history for an item' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Price history list',
  })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async getPriceHistory(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.itemsService.getPriceHistory(userId, id, limit ? +limit : 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an item by ID' })
  @ApiResponse({
    status: 200,
    description: 'Item details',
    type: ItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.itemsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an item' })
  @ApiResponse({
    status: 200,
    description: 'Item updated successfully',
    type: ItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    return this.itemsService.update(userId, id, updateItemDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an item (soft delete)' })
  @ApiResponse({ status: 204, description: 'Item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async remove(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    await this.itemsService.remove(userId, id);
  }

  @Post('sort-order')
  @ApiOperation({ summary: 'Bulk update item sort order' })
  @ApiResponse({ status: 200, description: 'Sort order updated successfully' })
  async updateSortOrder(
    @CurrentUser('userId') userId: string,
    @Body() updates: { id: string; sortOrder: number }[],
  ) {
    return this.itemsService.updateSortOrder(userId, updates);
  }
}
