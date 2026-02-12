import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';

type AppPlatform = 'android' | 'ios';

interface AppUpdateConfig {
  latestVersion: string | null;
  minSupportedVersion: string | null;
  forceUpdate: boolean;
  storeUrl: string | null;
  releaseNotes: string | null;
}

@Injectable()
export class AppUpdateService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async checkUpdate(platform: AppPlatform, currentVersion: string) {
    const config = await this.getEffectiveConfig(platform);
    const latestVersion = config.latestVersion;
    const minSupportedVersion = config.minSupportedVersion;

    if (!latestVersion) {
      return {
        platform,
        currentVersion,
        updateAvailable: false,
        forceUpdate: false,
        reason: 'latest_version_not_configured',
      };
    }

    const cmpLatest = this.compareVersions(currentVersion, latestVersion);
    const updateAvailable = cmpLatest < 0;

    const isBelowMin = minSupportedVersion
      ? this.compareVersions(currentVersion, minSupportedVersion) < 0
      : false;

    const forceUpdate = isBelowMin || (updateAvailable && config.forceUpdate);

    return {
      platform,
      currentVersion,
      latestVersion,
      minSupportedVersion,
      updateAvailable,
      forceUpdate,
      shouldBlockAppUsage: forceUpdate,
      storeUrl: config.storeUrl,
      releaseNotes: config.releaseNotes,
    };
  }

  private async getEffectiveConfig(platform: AppPlatform): Promise<AppUpdateConfig> {
    const envConfig = this.getEnvConfig(platform);
    const dbKey = platform === 'android' ? 'app_update_android' : 'app_update_ios';

    const dbConfig = await this.getJsonSystemConfig(dbKey);
    if (!dbConfig) {
      return envConfig;
    }

    return {
      latestVersion: this.stringOrNull(dbConfig.latestVersion) ?? envConfig.latestVersion,
      minSupportedVersion:
        this.stringOrNull(dbConfig.minSupportedVersion) ?? envConfig.minSupportedVersion,
      forceUpdate:
        this.boolOrNull(dbConfig.forceUpdate) ?? envConfig.forceUpdate,
      storeUrl: this.stringOrNull(dbConfig.storeUrl) ?? envConfig.storeUrl,
      releaseNotes:
        this.stringOrNull(dbConfig.releaseNotes) ?? envConfig.releaseNotes,
    };
  }

  private getEnvConfig(platform: AppPlatform): AppUpdateConfig {
    const base = this.configService.get<any>('app.appUpdate');
    const cfg = base?.[platform];
    return {
      latestVersion: cfg?.latestVersion ?? null,
      minSupportedVersion: cfg?.minSupportedVersion ?? null,
      forceUpdate: cfg?.forceUpdate === true,
      storeUrl: cfg?.storeUrl ?? null,
      releaseNotes: cfg?.releaseNotes ?? null,
    };
  }

  private compareVersions(a: string, b: string): number {
    const parse = (v: string) =>
      v
        .replace(/[^\d.]/g, '')
        .split('.')
        .filter((x) => x.length > 0)
        .map((n) => Number(n) || 0);

    const av = parse(a);
    const bv = parse(b);
    const len = Math.max(av.length, bv.length);
    for (let i = 0; i < len; i += 1) {
      const x = av[i] ?? 0;
      const y = bv[i] ?? 0;
      if (x > y) return 1;
      if (x < y) return -1;
    }
    return 0;
  }

  private async getJsonSystemConfig(
    key: string,
  ): Promise<Record<string, unknown> | null> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
      select: { value: true },
    });
    if (!config?.value) return null;
    try {
      return JSON.parse(config.value);
    } catch {
      return null;
    }
  }

  private stringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private boolOrNull(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    return null;
  }
}
