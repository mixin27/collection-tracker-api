import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SuggestionsService } from './suggestions.service';
import {
  SuggestionQueryDto,
  TrackCollectionSuggestionDto,
  TrackTagSuggestionDto,
} from './dto/suggestions.dto';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('suggestions')
@ApiBearerAuth()
@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Public()
  @Get('collections')
  @ApiOperation({ summary: 'Get collection suggestions' })
  @ApiResponse({ status: 200, description: 'Collection suggestions' })
  async getCollectionSuggestions(@Query() query: SuggestionQueryDto) {
    return this.suggestionsService.getCollectionSuggestions(query);
  }

  @Public()
  @Get('tags')
  @ApiOperation({ summary: 'Get tag suggestions' })
  @ApiResponse({ status: 200, description: 'Tag suggestions' })
  async getTagSuggestions(@Query() query: SuggestionQueryDto) {
    return this.suggestionsService.getTagSuggestions(query);
  }

  @Post('collections/track')
  @ApiOperation({ summary: 'Track collection suggestion usage' })
  @ApiResponse({ status: 201, description: 'Collection suggestion tracked' })
  async trackCollectionSuggestion(@Body() dto: TrackCollectionSuggestionDto) {
    return this.suggestionsService.trackCollectionSuggestion(dto);
  }

  @Post('tags/track')
  @ApiOperation({ summary: 'Track tag suggestion usage' })
  @ApiResponse({ status: 201, description: 'Tag suggestion tracked' })
  async trackTagSuggestion(@Body() dto: TrackTagSuggestionDto) {
    return this.suggestionsService.trackTagSuggestion(dto);
  }
}
