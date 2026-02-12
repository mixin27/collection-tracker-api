import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.service';
import { ChangePasswordDto, UpdateProfileDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        displayName: true,
        photoUrl: true,
        provider: true,
        subscriptionTier: true,
        maxCollections: true,
        maxItemsPerCollection: true,
        maxTags: true,
        maxDevices: true,
        createdAt: true,
        updatedAt: true,
        lastSyncAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { user };
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName?.trim() || undefined,
        photoUrl: dto.photoUrl?.trim() || undefined,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        photoUrl: true,
        updatedAt: true,
      },
    });

    return { user: updated };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.currentPassword === dto.newPassword) {
      throw new ConflictException(
        'New password must be different from current password',
      );
    }

    const account = await this.prisma.account.findFirst({
      where: {
        userId,
        provider: 'local',
      },
      select: {
        id: true,
        password: true,
      },
    });

    if (!account?.password) {
      throw new UnauthorizedException('Local password account not found');
    }

    const valid = await bcrypt.compare(dto.currentPassword, account.password);
    if (!valid) {
      throw new UnauthorizedException('Current password is invalid');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.account.update({
      where: { id: account.id },
      data: { password: hashed },
    });

    return { changed: true };
  }
}
