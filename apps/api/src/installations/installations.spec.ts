import { Pool } from 'pg';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { runMigrations } from '../db/migrate';
import created from './fixtures/installation.created.json';
import deleted from './fixtures/installation.deleted.json';
import suspend from './fixtures/installation.suspend.json';
import { applyInstallationEvent, installationEventSchema } from './installations';

describe('installationEventSchema', () => {
  it('parses the fixtures down to the stored fields', () => {
    expect(installationEventSchema.parse(created)).toEqual({
      action: 'created',
      installation: { id: 424242, account: { login: 'octo-org' }, repository_selection: 'selected' },
    });
  });

  it('rejects a payload without an installation', () => {
    expect(() => installationEventSchema.parse({ action: 'created' })).toThrow(ZodError);
  });
});

describe('applyInstallationEvent (mock pool)', () => {
  const setup = () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 });
    return { query, pool: { query } };
  };

  it('upserts an active installation on created', async () => {
    const { query, pool } = setup();
    await applyInstallationEvent(pool, created);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT (id) DO UPDATE'), [424242, 'octo-org', 'selected']);
  });

  it.each([['deleted', deleted], ['suspend', suspend]])('deactivates on %s', async (_, payload) => {
    const { query, pool } = setup();
    await applyInstallationEvent(pool, payload);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('active = FALSE'), [424242]);
  });

  it('ignores other actions', async () => {
    const { query, pool } = setup();
    await applyInstallationEvent(pool, { ...created, action: 'new_permissions_accepted' });
    expect(query).not.toHaveBeenCalled();
  });
});

// Integration test: skipped when Postgres is unreachable (e.g. CI has none).
const pg = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://reviewer:reviewer@localhost:5432/reviewer',
  connectionTimeoutMillis: 1000,
});

afterAll(() => pg.end());

describe('applyInstallationEvent (postgres)', () => {
  it('created → active, suspend → inactive, created again → active', async (ctx) => {
    try {
      await pg.query('SELECT 1');
    } catch {
      ctx.skip();
    }
    await runMigrations(pg);
    const active = async () => (await pg.query('SELECT active FROM installations WHERE id = $1', [424242])).rows[0]?.active;
    try {
      await applyInstallationEvent(pg, created);
      expect(await active()).toBe(true);
      await applyInstallationEvent(pg, suspend);
      expect(await active()).toBe(false);
      await applyInstallationEvent(pg, created);
      expect(await active()).toBe(true);
      await applyInstallationEvent(pg, deleted);
      expect(await active()).toBe(false);
    } finally {
      await pg.query('DELETE FROM installations WHERE id = $1', [424242]);
    }
  });
});
