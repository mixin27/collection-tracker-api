import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

export class AppUpdateCheckQueryDto {
  @ApiProperty({ enum: ['android', 'ios'] })
  @IsString()
  @IsIn(['android', 'ios'])
  platform: 'android' | 'ios';

  @ApiProperty({ example: '1.2.3' })
  @IsString()
  @MinLength(1)
  currentVersion: string;
}
