import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ADMIN_ONLY_KEY } from '../decorators/admin.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isAdminOnly = this.reflector.getAllAndOverride<boolean>(
      ADMIN_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isAdminOnly) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { email?: string } | undefined;
    const userEmail = user?.email?.toLowerCase();

    if (!userEmail) {
      throw new ForbiddenException('Admin access is required');
    }

    const adminEmails =
      this.configService
        .get<string[]>('app.adminEmails')
        ?.map((email) => email.toLowerCase()) || [];

    if (!adminEmails.includes(userEmail)) {
      throw new ForbiddenException('Admin access is required');
    }

    return true;
  }
}
