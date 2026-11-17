import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './db/deliveries';
import { parseEnv } from './env';
import { HealthController } from './health.controller';
import { createWebhookQueue, WEBHOOK_QUEUE } from './queue/webhook-queue';
import { WEBHOOK_SECRET, WebhooksController } from './webhooks/webhooks.controller';

@Module({
  controllers: [HealthController, WebhooksController],
  providers: [
    { provide: WEBHOOK_SECRET, useFactory: () => parseEnv(process.env).GITHUB_WEBHOOK_SECRET },
    { provide: PG_POOL, useFactory: () => new Pool({ connectionString: parseEnv(process.env).DATABASE_URL }) },
    { provide: WEBHOOK_QUEUE, useFactory: () => createWebhookQueue(parseEnv(process.env).REDIS_URL) },
  ],
})
export class AppModule {}
