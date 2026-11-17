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
- `main`: `5ff75b1` (PRs #1 scaffold, #2 docker compose, #3 env validation merged)
- `feature/ci-workflow` (off main): `.github/workflows/ci.yml` runs install, lint, typecheck, test, build on Node 22. PR #4 open, not merged.
- `feature/eslint` (stacked on `feature/ci-workflow`): root flat `eslint.config.mjs` (typescript-eslint recommended everywhere, `eslint-config-next` core-web-vitals + typescript for `apps/web`). Root `pnpm lint` = `eslint . --max-warnings 0`. User approved eslint, typescript-eslint, eslint-config-next. Lint, typecheck, test, build pass. Not pushed.

## Next tasks (M1)
1. Merge PR #4, then push `feature/eslint` and open PR (needs user OK).
2. Verify all DoD items, `pnpm build`, PROGRESS.md line, milestone report.

## Gotchas
- Docker Desktop may be stopped: `open -a Docker`, then `docker compose -f infra/docker-compose.yml up -d --wait`. Local DB creds: `reviewer`/`reviewer`/`reviewer` on 5432.
- `ls` is aliased to colorls; use `/bin/ls` or `find`.
- Vitest/esbuild emits no decorator metadata: instantiate Nest controllers directly in tests.
- `pnpm peers check` warns eslint 10 is above the peer range of eslint-plugin-react/import/jsx-a11y (via eslint-config-next). Lint runs fine; revisit if a rule crashes.
- "No projects matched" from `pnpm -r --if-present` is fine (exit 0).
