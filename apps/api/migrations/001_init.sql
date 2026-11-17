CREATE TABLE IF NOT EXISTS installations (
  id                   BIGINT PRIMARY KEY, -- GitHub installation id
  account_login        TEXT NOT NULL,
  repository_selection TEXT NOT NULL,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  delivery_id TEXT PRIMARY KEY, -- X-GitHub-Delivery
  event       TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
