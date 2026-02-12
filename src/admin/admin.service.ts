import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import {
  UpdateGlobalFreeConfigDto,
  UpdateTrialConfigDto,
} from './dto/admin-entitlements.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getEntitlementsConfig() {
    const [trialConfig, globalFreeConfig] = await Promise.all([
      this.getJsonSystemConfig('trial_config'),
      this.getJsonSystemConfig('global_free_access'),
    ]);

    const envTrial = {
      enabled: this.configService.get<boolean>('app.trial.enabled') ?? true,
      days: this.configService.get<number>('app.trial.days') ?? 14,
      tier: this.configService.get<string>('app.trial.tier') ?? 'PREMIUM',
    };

    const envGlobalFree = {
      enabled:
        this.configService.get<boolean>('app.globalFreeAccess.enabled') ?? false,
      tier:
        this.configService.get<string>('app.globalFreeAccess.tier') || 'PREMIUM',
      startAt: this.configService.get<string | null>('app.globalFreeAccess.startAt'),
      endAt: this.configService.get<string | null>('app.globalFreeAccess.endAt'),
    };

    return {
      trial: {
        effective: {
          enabled: trialConfig?.enabled ?? envTrial.enabled,
          days: Number(trialConfig?.days ?? envTrial.days),
          tier: String(trialConfig?.tier ?? envTrial.tier),
        },
        envDefault: envTrial,
        dbOverride: trialConfig,
      },
      globalFreeAccess: {
        effective: {
          enabled: globalFreeConfig?.enabled ?? envGlobalFree.enabled,
          tier: String(globalFreeConfig?.tier ?? envGlobalFree.tier),
          startAt:
            (globalFreeConfig?.startAt as string | null | undefined) ??
            envGlobalFree.startAt,
          endAt:
            (globalFreeConfig?.endAt as string | null | undefined) ??
            envGlobalFree.endAt,
        },
        envDefault: envGlobalFree,
        dbOverride: globalFreeConfig,
      },
    };
  }

  async updateTrialConfig(adminUserId: string, dto: UpdateTrialConfigDto) {
    const value = JSON.stringify({
      enabled: dto.enabled,
      days: dto.days,
      tier: dto.tier,
    });

    await this.prisma.systemConfig.upsert({
      where: { key: 'trial_config' },
      update: { value },
      create: { key: 'trial_config', value },
    });

    await this.logAdminChange(adminUserId, 'admin_trial_config_updated', {
      trialConfig: dto,
    });

    return this.getEntitlementsConfig();
  }

  async updateGlobalFreeConfig(
    adminUserId: string,
    dto: UpdateGlobalFreeConfigDto,
  ) {
    const value = JSON.stringify({
      enabled: dto.enabled,
      tier: dto.tier,
      startAt: dto.startAt ?? null,
      endAt: dto.endAt ?? null,
    });

    await this.prisma.systemConfig.upsert({
      where: { key: 'global_free_access' },
      update: { value },
      create: { key: 'global_free_access', value },
    });

    await this.logAdminChange(adminUserId, 'admin_global_free_updated', {
      globalFreeAccess: dto,
    });

    return this.getEntitlementsConfig();
  }

  private async getJsonSystemConfig(
    key: string,
  ): Promise<Record<string, unknown> | null> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
      select: { value: true },
    });

    if (!config?.value) {
      return null;
    }

    try {
      return JSON.parse(config.value);
    } catch {
      return null;
    }
  }

  private async logAdminChange(
    adminUserId: string,
    action: string,
    metadata: Record<string, unknown>,
  ) {
    await this.prisma.userActivity.create({
      data: {
        userId: adminUserId,
        action,
        entityType: 'system_config',
        metadata: JSON.stringify(metadata),
      },
    });
  }
}
