import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { recordDelivery } from './deliveries';
import { runMigrations } from './migrate';

// Integration test: skipped when Postgres is unreachable (e.g. CI has none).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://reviewer:reviewer@localhost:5432/reviewer',
  connectionTimeoutMillis: 1000,
});

afterAll(() => pool.end());

describe('webhook deliveries (postgres)', () => {
  it('migrates idempotently and dedupes deliveries', async (ctx) => {
    try {
      await pool.query('SELECT 1');
    } catch {
      ctx.skip();
    }
    await runMigrations(pool);
    expect(await runMigrations(pool)).toEqual([]);

    const id = randomUUID();
    expect(await recordDelivery(pool, id, 'ping')).toBe(true);
    expect(await recordDelivery(pool, id, 'ping')).toBe(false);
    await pool.query('DELETE FROM webhook_deliveries WHERE delivery_id = $1', [id]);
  });
});
