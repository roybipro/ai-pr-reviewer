# Session Handoff

Read this first in a new session. Update it after every task.

## Rules (summary)
- Spec: `docs/PRD.md`, `docs/MILESTONES.md`. One milestone at a time; don't advance until every DoD item passes.
- After each task: `pnpm lint && pnpm typecheck && pnpm test` pass (`pnpm build` at milestone end).
- Secret check before commit: `git diff --cached | grep -iE "secret|token|private|password|BEGIN .* KEY"`. Never commit `.env` or real keys.
- `git add` only the task's files. Conventional commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- One branch per task/feature, PR into `main`; PR body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Push rejected: `git pull --rebase origin main`, rerun checks, push. Never `--force`. Any other push failure: stop and report.
- Milestone end: add a line to `docs/PROGRESS.md` (milestone, date, DoD result, commit hash).
- Stack is fixed (pnpm, NestJS, Next.js App Router + Tailwind, zod, Postgres 16 plain SQL, Redis + BullMQ, `@octokit/app`, Vitest, Playwright, Docker Compose). Ask before adding anything else.
- Ask before: stack/schema/review-policy changes, new dependencies, choosing the LLM provider (before M4), deleting files, rewriting history, anything that posts to GitHub or calls a paid API.
- Tests never call the paid LLM API or post to GitHub.

## Current state
- Milestone: **1 — Repository and Infrastructure**
- `main`: `0c9fe84` chore: initialize pnpm workspace
- `feature/scaffold-apps`: `e6baf46` scaffold api (NestJS, `GET /health`), web (Next.js 16 + Tailwind v4), shared. PR #1 open.
- `feature/docker-compose` (off main): `infra/docker-compose.yml` Postgres 16 + Redis 7 with healthchecks. Verified `up -d --wait`, `psql` and `redis-cli ping`. PR not opened yet.

## Next tasks (M1)
1. Open PR for `feature/docker-compose` (needs user OK: posts to GitHub).
2. After PR #1 merges, branch off main: `.env.example` + zod env validation in API (missing var exits with clear message).
3. Lint: needs user approval for ESLint (not in approved stack).
4. CI workflow `.github/workflows/ci.yml` running lint, typecheck, test, build.
5. Verify all DoD items, `pnpm build`, PROGRESS.md line, milestone report.

## Gotchas
- Docker Desktop may be stopped: `open -a Docker`, then `docker compose -f infra/docker-compose.yml up -d --wait`. Local DB creds: `reviewer`/`reviewer`/`reviewer` on 5432.
- `ls` is aliased to colorls; use `/bin/ls` or `find`.
- Vitest/esbuild emits no decorator metadata: instantiate Nest controllers directly in tests.
- "No projects matched" from `pnpm -r --if-present` is fine (exit 0).
