import { BadRequestException, Controller, Headers, HttpCode, Inject, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL, recordDelivery } from '../db/deliveries';
import { verifySignature } from './verify-signature';

export const WEBHOOK_SECRET = 'GITHUB_WEBHOOK_SECRET';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    @Inject(WEBHOOK_SECRET) private readonly secret: string,
    @Inject(PG_POOL) private readonly pool: Pick<Pool, 'query'>,
  ) {}

  @Post('github')
  @HttpCode(202)
  async receive(
    @Req() req: { rawBody?: Buffer },
    @Headers('x-hub-signature-256') signature?: string,
    @Headers('x-github-delivery') deliveryId?: string,
    @Headers('x-github-event') event?: string,
  ): Promise<void> {
    if (!req.rawBody || !verifySignature(this.secret, req.rawBody, signature)) {
      throw new UnauthorizedException();
    }
    if (!deliveryId || !event) throw new BadRequestException('missing delivery headers');
    // Duplicate deliveries are still 202; task 4 enqueues only when this returns true.
    await recordDelivery(this.pool, deliveryId, event);
  }
}
