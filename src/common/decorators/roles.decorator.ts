import { SubscriptionTier } from '@/generated/prisma/client';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const RequireSubscription = (...tiers: SubscriptionTier[]) =>
  SetMetadata(ROLES_KEY, tiers);
