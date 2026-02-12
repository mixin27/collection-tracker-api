import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  CreatePriceHistoryDto,
  UpdatePriceHistoryDto,
} from './dto/price-history.dto';
import { PriceHistoryService } from './price-history.service';

@ApiTags('price-history')
@ApiBearerAuth()
@Controller('price-history')
export class PriceHistoryController {
  constructor(private readonly priceHistoryService: PriceHistoryService) {}

  @Post('items/:itemId')
  @ApiOperation({ summary: 'Create price history entry for an item' })
  @ApiResponse({ status: 201, description: 'Price history entry created' })
  async createForItem(
    @CurrentUser('userId') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: CreatePriceHistoryDto,
  ) {
    return this.priceHistoryService.createForItem(userId, itemId, dto);
  }

  @Get('items/:itemId')
  @ApiOperation({ summary: 'List price history entries for an item' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Price history list' })
  async listForItem(
    @CurrentUser('userId') userId: string,
    @Param('itemId') itemId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.priceHistoryService.listForItem(
      userId,
      itemId,
      limit ? +limit : 50,
      offset ? +offset : 0,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a price history entry' })
  @ApiResponse({ status: 200, description: 'Price history entry updated' })
  async updateEntry(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePriceHistoryDto,
  ) {
    return this.priceHistoryService.updateEntry(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a price history entry' })
  @ApiResponse({ status: 200, description: 'Price history entry deleted' })
  async deleteEntry(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.priceHistoryService.deleteEntry(userId, id);
  }
}
