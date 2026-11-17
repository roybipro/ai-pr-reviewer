import { Module } from '@nestjs/common';
import { parseEnv } from './env';
import { HealthController } from './health.controller';
import { WEBHOOK_SECRET, WebhooksController } from './webhooks/webhooks.controller';

@Module({
  controllers: [HealthController, WebhooksController],
  providers: [
    { provide: WEBHOOK_SECRET, useFactory: () => parseEnv(process.env).GITHUB_WEBHOOK_SECRET },
  ],
})
export class AppModule {}
