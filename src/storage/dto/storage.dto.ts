import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreatePresignedUrlDto {
  @ApiProperty({ example: 'cover.jpg' })
  @IsString()
  @MinLength(1)
  fileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MinLength(1)
  contentType: string;

  @ApiProperty({
    example: 'collections/covers',
    required: false,
    description: 'Optional sub-folder inside users/<userId>/',
  })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiProperty({
    example: 900,
    required: false,
    description: 'URL expiration in seconds (60-3600)',
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  expiresIn?: number;
}

export class PresignedUrlResponseDto {
  @ApiProperty()
  uploadUrl: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  fileUrl: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;

  @ApiProperty({ example: 'PUT' })
  method: string;
}

export class DeleteFileResponseDto {
  @ApiProperty()
  deleted: boolean;

  @ApiProperty()
  key: string;
}
