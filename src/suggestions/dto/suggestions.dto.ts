import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SuggestionQueryDto {
  @ApiProperty({ required: false, example: 'boo' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ required: false, example: 'book' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, example: 'hobby' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false, example: 20, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class TrackCollectionSuggestionDto {
  @ApiProperty({ example: 'Books' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'book' })
  @IsString()
  @MaxLength(100)
  type: string;

  @ApiProperty({ required: false, example: 'hobby' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}

export class TrackTagSuggestionDto {
  @ApiProperty({ example: 'Fantasy' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ required: false, example: 'genre' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
