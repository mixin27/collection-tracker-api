import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Delete,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  GoogleAuthDto,
  RefreshTokenDto,
  AuthResponseDto,
} from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with Google (mobile native flow)' })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid Google token' })
  async googleAuth(@Body() dto: GoogleAuthDto): Promise<AuthResponseDto> {
    return this.authService.googleAuth(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout from current device' })
  @ApiResponse({ status: 204, description: 'Successfully logged out' })
  async logout(
    @CurrentUser('userId') userId: string,
    @CurrentUser('deviceId') deviceId: string,
  ) {
    await this.authService.logout(userId, deviceId);
  }

  @Post('logout-all')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({
    status: 204,
    description: 'Successfully logged out from all devices',
  })
  async logoutAll(@CurrentUser('userId') userId: string) {
    await this.authService.logoutAll(userId);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of active device sessions' })
  @ApiResponse({ status: 200, description: 'List of active sessions' })
  async getSessions(@CurrentUser('userId') userId: string) {
    const sessions = await this.prisma.deviceSession.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        deviceOs: true,
        appVersion: true,
        lastActiveAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: {
        lastActiveAt: 'desc',
      },
    });

    return { sessions };
  }

  @Delete('sessions/:sessionId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a specific device session' })
  @ApiResponse({ status: 204, description: 'Session removed successfully' })
  async removeSession(
    @CurrentUser('userId') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    await this.prisma.deviceSession.updateMany({
      where: {
        id: sessionId,
        userId, // Ensure user owns this session
      },
      data: {
        isActive: false,
      },
    });
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getProfile(@CurrentUser('userId') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        photoUrl: true,
        subscriptionTier: true,
        maxCollections: true,
        maxItemsPerCollection: true,
        maxTags: true,
        maxDevices: true,
        createdAt: true,
        lastSyncAt: true,
      },
    });

    return { user };
  }
}
