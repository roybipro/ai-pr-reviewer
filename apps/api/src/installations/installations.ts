import type { Pool } from 'pg';
import { z } from 'zod';

// Only the fields we store; zod strips the rest of GitHub's payload.
export const installationEventSchema = z.object({
  action: z.string(),
  installation: z.object({
    id: z.number().int(),
    account: z.object({ login: z.string() }),
    repository_selection: z.string(),
  }),
});

export type InstallationEvent = z.infer<typeof installationEventSchema>;

// FR-3. Idempotent, so a redelivered event is safe to apply again.
export async function applyInstallationEvent(pool: Pick<Pool, 'query'>, payload: unknown): Promise<void> {
  const { action, installation } = installationEventSchema.parse(payload);
  if (action === 'created') {
    await pool.query(
      `INSERT INTO installations (id, account_login, repository_selection, active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (id) DO UPDATE SET account_login = EXCLUDED.account_login,
         repository_selection = EXCLUDED.repository_selection, active = TRUE, updated_at = now()`,
      [installation.id, installation.account.login, installation.repository_selection],
    );
  } else if (action === 'deleted' || action === 'suspend') {
    await pool.query('UPDATE installations SET active = FALSE, updated_at = now() WHERE id = $1', [installation.id]);
  }
}
