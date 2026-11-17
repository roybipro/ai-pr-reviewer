import { createHmac } from 'node:crypto';
import { Socket } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { WebhooksController } from '../webhooks/webhooks.controller';
import { createWebhookQueue, type WebhookJob } from './webhook-queue';
import type { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const secret = 'test-secret';

// Resolves false instead of letting BullMQ retry forever when Redis is down (e.g. CI).
function redisReachable(url: string): Promise<boolean> {
  const { hostname, port } = new URL(url);
  return new Promise((resolve) => {
    const socket = new Socket();
    const done = (ok: boolean) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(500, () => done(false));
    socket.once('error', () => done(false));
    socket.connect(Number(port || 6379), hostname, () => done(true));
  });
}

describe('webhook queue (real Redis)', () => {
  let queue: Queue<WebhookJob> | undefined;
  afterAll(async () => {
    await queue?.obliterate({ force: true }).catch(() => undefined);
    await queue?.close();
  });

  it('responds in under 1s with the job queued under the delivery id', async (ctx) => {
    if (!(await redisReachable(redisUrl))) ctx.skip();
    queue = createWebhookQueue(redisUrl);
    const deliveryId = `test-${Date.now()}`;
    const body = Buffer.from('{"zen":"hi"}');
    const sig = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
    const pool = { query: async () => ({ rowCount: 1 }) };
    const controller = new WebhooksController(secret, pool as never, queue);

    const start = performance.now();
    await controller.receive({ rawBody: body }, sig, deliveryId, 'ping');
    expect(performance.now() - start).toBeLessThan(1000);

    const job = await queue.getJob(deliveryId);
    expect(job?.data).toEqual({ deliveryId, event: 'ping', payload: body.toString() });
  });
});
