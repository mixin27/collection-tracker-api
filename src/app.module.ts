import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Config
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import awsConfig from './config/aws.config';
import googleConfig from './config/google.config';

// Core modules
import { PrismaModule } from './prisma/prisma.module';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
// import { UsersModule } from './users/users.module';
// import { SessionsModule } from './sessions/sessions.module';
// import { SyncModule } from './sync/sync.module';
// import { CollectionsModule } from './collections/collections.module';
// import { ItemsModule } from './items/items.module';
// import { TagsModule } from './tags/tags.module';
// import { PaymentsModule } from './payments/payments.module';
// import { StorageModule } from './storage/storage.module';
// import { LoansModule } from './loans/loans.module';
// import { PriceHistoryModule } from './price-history/price-history.module';
// import { SuggestionsModule } from './suggestions/suggestions.module';
// import { AnalyticsModule } from './analytics/analytics.module';
import { CollectionModule } from './collection/collection.module';
import { ItemsModule } from './items/items.module';
import { TagsModule } from './tags/tags.module';
import { SyncModule } from './sync/sync.module';
import { LoansModule } from './loans/loans.module';
import { StorageModule } from './storage/storage.module';
import { AdminModule } from './admin/admin.module';
import { PaymentsModule } from './payments/payments.module';
import { SuggestionsModule } from './suggestions/suggestions.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, awsConfig, googleConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Scheduling for background jobs
    ScheduleModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per TTL
      },
    ]),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    CollectionModule,
    ItemsModule,
    TagsModule,
    SyncModule,
    LoansModule,
    StorageModule,
    AdminModule,
    PaymentsModule,
    SuggestionsModule,
    // Uncomment as modules are created:
    // UsersModule,
    // SessionsModule,
    // PaymentsModule,
    // StorageModule,
    // LoansModule,
    // PriceHistoryModule,
    // SuggestionsModule,
    // AnalyticsModule,
  ],
  controllers: [],
  providers: [
    // Global JWT authentication guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
