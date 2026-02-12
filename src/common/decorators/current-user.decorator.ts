import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  userId: string;
  email: string;
  subscriptionTier: string;
  entitlementSource?: 'BASE' | 'PAID_SUBSCRIPTION' | 'TRIAL' | 'GLOBAL_FREE';
  deviceId?: string;
  sessionId?: string;
  limits: AuthUserLimits;
}

export interface AuthUserLimits {
  maxCollections: number;
  maxItemsPerCollection: number;
  maxTags: number;
  maxDevices: number;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
