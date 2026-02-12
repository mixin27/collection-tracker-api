import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ example: 'device-uuid-123' })
  @IsString()
  deviceId: string;

  @ApiProperty({ example: 'iPhone 14 Pro' })
  @IsString()
  deviceName: string;

  @ApiProperty({ example: 'iOS 17.1' })
  @IsString()
  deviceOs: string;

  @ApiProperty({ example: '1.0.0', required: false })
  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'device-uuid-123' })
  @IsString()
  deviceId: string;

  @ApiProperty({ example: 'iPhone 14 Pro' })
  @IsString()
  deviceName: string;

  @ApiProperty({ example: 'iOS 17.1' })
  @IsString()
  deviceOs: string;

  @ApiProperty({ example: '1.0.0', required: false })
  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class GoogleAuthDto {
  @ApiProperty({ example: 'google-id-token-here' })
  @IsString()
  idToken: string;

  @ApiProperty({ example: 'device-uuid-123' })
  @IsString()
  deviceId: string;

  @ApiProperty({ example: 'iPhone 14 Pro' })
  @IsString()
  deviceName: string;

  @ApiProperty({ example: 'iOS 17.1' })
  @IsString()
  deviceOs: string;

  @ApiProperty({ example: '1.0.0', required: false })
  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'refresh-token-here' })
  @IsString()
  refreshToken: string;

  @ApiProperty({ example: 'device-uuid-123' })
  @IsString()
  deviceId: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    displayName: string | null;
    photoUrl: string | null;
    subscriptionTier: string;
  };

  @ApiProperty()
  session: {
    id: string;
    deviceId: string;
    deviceName: string;
    expiresAt: Date;
  };
}
