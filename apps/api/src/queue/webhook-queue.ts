import { Queue } from 'bullmq';

export const WEBHOOK_QUEUE = 'WEBHOOK_QUEUE';
export const WEBHOOK_QUEUE_NAME = 'webhooks';

export interface WebhookJob {
  deliveryId: string;
  event: string;
  // Raw JSON body; the worker parses and validates it.
  payload: string;
}

export function createWebhookQueue(redisUrl: string): Queue<WebhookJob> {
  return new Queue<WebhookJob>(WEBHOOK_QUEUE_NAME, { connection: { url: redisUrl } });
}
