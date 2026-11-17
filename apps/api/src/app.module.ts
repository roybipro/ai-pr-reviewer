import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './db/deliveries';
import { parseEnv } from './env';
import { HealthController } from './health.controller';
import { WEBHOOK_SECRET, WebhooksController } from './webhooks/webhooks.controller';

@Module({
  controllers: [HealthController, WebhooksController],
  providers: [
    { provide: WEBHOOK_SECRET, useFactory: () => parseEnv(process.env).GITHUB_WEBHOOK_SECRET },
    { provide: PG_POOL, useFactory: () => new Pool({ connectionString: parseEnv(process.env).DATABASE_URL }) },
  ],
})
export class AppModule {}
