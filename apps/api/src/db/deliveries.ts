import type { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';

/** Records a webhook delivery. Returns false if this delivery id was already seen. */
export async function recordDelivery(pool: Pick<Pool, 'query'>, deliveryId: string, event: string): Promise<boolean> {
  const res = await pool.query(
    'INSERT INTO webhook_deliveries (delivery_id, event) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [deliveryId, event],
  );
  return res.rowCount === 1;
}
