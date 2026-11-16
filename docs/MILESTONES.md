# Milestones: AI Pull Request Reviewer

Each milestone ends with a Definition of Done (DoD). A milestone is complete only when every DoD item passes and is verified with evidence. Work on one milestone at a time, in order. Requirement IDs (FR-x, NFR) refer to `docs/PRD.md`.

## Milestone 1: Repository and Infrastructure

**Goal:** the monorepo builds, the database and queue run locally, and both apps start.

**Tasks**
- Create the pnpm workspace with `apps/api`, `apps/web`, and `packages/shared`.
- Scaffold NestJS in `apps/api` and Next.js (App Router, TypeScript, Tailwind) in `apps/web`.
- Write `infra/docker-compose.yml` with PostgreSQL 16 and Redis 7.
- Add `.env.example` with placeholder values for every variable.
- Validate environment variables at startup with zod. A missing variable stops the app.
- Set up lint, typecheck, test, and build scripts at the root. Add a CI workflow that runs them.

**Definition of Done**
- `docker compose up -d` starts Postgres and Redis, and a `psql` connection succeeds.
- `pnpm dev` starts both apps. The API responds on a health endpoint.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.
- CI passes on a pull request.
- Starting the API without a required variable fails with a clear message.

## Milestone 2: GitHub App and Webhook Verification

**Goal:** GitHub webhooks reach the API, and only authentic requests are accepted. (FR-1, FR-2, FR-5)

**Tasks**
- Register a GitHub App in developer settings with the permissions from FR-2 and the `pull_request` and `installation` events.
- Configure the API to keep the raw request body (`rawBody: true`).
- Implement `verifySignature` using HMAC SHA-256 with a timing-safe comparison. Check lengths before comparing.
- Implement `POST /webhooks/github`: verify the signature, store `X-GitHub-Delivery`, enqueue a job, and return `202`.
- Handle `installation` events by creating or deactivating installation records. (FR-3)
- Set up a local webhook tunnel (smee.io or ngrok) for testing.

**Definition of Done**
- A test delivery from GitHub is accepted and recorded.
- A request with a wrong or missing signature returns `401` and enqueues nothing.
- Unit tests cover a valid signature, a tampered body, a missing header, and a header of the wrong length.
- The endpoint returns in under 1 second with a queued job.
- No webhook secret or token appears in logs (verified by a test that inspects logger output).

## Milestone 3: Diff Fetching and Line Parser

**Goal:** the worker fetches changed files for a pull request, and the diff parser correctly identifies commentable lines. (FR-10, FR-11, FR-17)

**Tasks**
- Implement installation token retrieval per job, through `@octokit/app`.
- Fetch the pull request's files with patches, handling pagination.
- Implement `commentableLines(patch)` in `packages/shared/diff.ts`. Lines start with `+` or space, hunk headers set the line number, and `-` lines and `\ No newline` markers do not advance it.
- Implement the ignore-path filter, and skip binary files and files without patches.

**Definition of Done**
- The parser has unit tests for: a file with only deletions, a hunk with no context, a file without a trailing newline, a line starting with `++`, multiple hunks, and an empty patch.
- Each test's expected line numbers are checked against a real diff from GitHub.
- A test PR logs the correct list of reviewable files and skipped files.
- Lockfiles and `dist/**` are skipped in tests.

## Milestone 4: LLM Review with Structured Output

**Goal:** one LLM call returns valid, schema-checked findings for a seeded bug. (FR-12, FR-13, FR-14, NFR privacy)

**Tasks**
- Define the finding schema in `packages/shared` with zod: path, line, category, confidence, message.
- Build the review prompt: task instructions, review policy from PRD section 8, the diff delimited as data, and the rules block.
- Implement an LLM adapter interface with one real provider implementation and a mock implementation for tests.
- Parse and validate the response. Retry once on invalid JSON with a stricter instruction. Mark the file failed if the retry also fails.
- Filter findings below `min_confidence` and cap at `max_comments`.
- Send only changed hunks and surrounding context to the LLM.

**Definition of Done**
- Tests use the mock adapter. No test calls the paid API.
- Invalid JSON triggers exactly one retry, then a failed-file status.
- A seeded SQL injection in a test diff is reported with category `security` and the correct line.
- A test inspects the outgoing prompt and confirms no content outside the changed hunks and context is included.
- A prompt-injection test case (an instruction inside the diff) does not change the output format.

## Milestone 5: Posting, Idempotency, and Re-Review (MVP complete)

**Goal:** a single review is posted per commit, invalid lines never break a review, and new commits do not repeat old comments. (FR-9, FR-15, FR-16, FR-18, FR-19, FR-20, FR-21)

**Tasks**
- Validate every finding against `commentableLines` before posting. Store invalid findings with reason `line_not_in_diff`.
- Post one review with event `COMMENT` and all valid inline comments.
- Add the summary comment: finding counts, skipped files, and a placeholder dashboard link.
- Enforce one review per head SHA with the unique constraint on `review_runs`.
- On `synchronize`, compare candidate comments with existing comments by path, line, and message hash. Skip duplicates.
- Retry posting with backoff. Never post a partial review.
- Implement the large-diff budget: rank files by risk and list skipped files.
- Support the `pull_request` actions `opened`, `reopened`, and `synchronize`. Skip fork pull requests and record the reason.

**Definition of Done**
- A test PR gets exactly one review with the expected inline comments.
- A finding on a line outside the diff is stored with its reason and does not block the others.
- Redelivering the same webhook creates no second review.
- Pushing a new commit posts only new comments.
- A simulated GitHub failure retries, then marks the run failed without posting anything.
- Fork pull requests are skipped and logged with the reason.
- MVP exit criterion (PRD section 15): the app runs on three of your own repositories for two weeks, with no duplicate reviews and no unretried failed postings. Track this in a log.

## Milestone 6: Configuration File

**Goal:** `.reviewbot.yml` controls behavior, is read from the default branch, and falls back safely when invalid. (FR-22, FR-23, FR-24, FR-25, FR-6)

**Tasks**
- Read `.reviewbot.yml` from the default branch through the GitHub contents API.
- Validate against the schema in PRD Appendix A. Enforce ranges and limits.
- On invalid configuration, use defaults and add a notice to the summary naming the field.
- Pass `rules` into the review prompt as additional instructions.
- Support `focus`, `ignore_paths`, `min_confidence`, `max_comments`, and `draft_reviews`.
- Store the configuration error state on the repository record.

**Definition of Done**
- A test PR from a branch that edits `.reviewbot.yml` is reviewed with the default branch's configuration, not the PR's.
- Each config field has a test showing it changes behavior.
- An invalid value (for example, `min_confidence: 2`) triggers defaults and a named notice.
- Draft pull requests are skipped unless `draft_reviews: true`.
- Rules over 300 characters or more than 20 rules are rejected.

## Milestone 7: Dashboard and Cost Tracking

**Goal:** the signed-in user sees runs, findings, and cost, scoped to their own installations. (FR-1, FR-4, FR-29 to FR-33, NFR observability)

**Tasks**
- Implement GitHub OAuth sign-in in `apps/web`, with the session stored in an httpOnly cookie.
- Add Next.js middleware to protect dashboard routes, and check access on every API request.
- Pages: installations and repositories, run list per repository, run detail with findings and filter reasons.
- Record token counts and estimated cost per run. Show monthly totals per installation.
- Add a cost alert when the seven-day average rises more than 25%.
- Add a monthly spending cap that stops new reviews when reached. (FR-34)
- Add the `review_started`, `review_completed`, `review_failed`, and `finding_filtered` events.

**Definition of Done**
- A user cannot see another installation's runs. Test by signing in as a second user.
- The run detail page shows each finding and, for filtered findings, the reason.
- Cost totals match the sum of stored run costs.
- Reaching the spending cap stops new reviews and shows a clear message.
- The dashboard passes an accessibility check for contrast and keyboard navigation.
- Lighthouse accessibility score is 90 or higher on the main pages.

## Milestone 8: Evaluation, Feedback, and Deployment (v1 complete)

**Goal:** published benchmark results, feedback tracking, and a live deployment. (FR-26, FR-28, PRD sections 12 and 13)

**Tasks**
- Build the planted-bug benchmark repository with about 30 seeded defects across the five categories, and a known-location answer key.
- Write the evaluation script. One command runs the review and outputs precision, recall per category, noise, and cost.
- Build the real-PR replay set from merged open-source pull requests where a later commit fixed a bug.
- Label every posted comment in the benchmark (correct, incorrect, or style). Label 100 comments twice and compute Cohen's kappa.
- Track comment outcomes (resolved, replied, untouched) through review comment webhooks and GraphQL.
- Deploy the API and worker to a container platform, the dashboard to a static or edge host, and use managed Postgres and Redis.
- Write the README: architecture diagram, LLM data disclosure, benchmark results table, known limitations, and setup steps.

**Definition of Done**
- One command reproduces the benchmark numbers in the README.
- The results table reports precision, recall, noise, cost, number of pull requests, and confidence intervals.
- Cohen's kappa is reported for the labeling sample.
- The app is installed on your own repositories in production and has run for at least one week.
- Uninstalling the app in production stops reviews (verified).
- The README discloses the third-party LLM provider and the 14-day diff retention.
- The demo recording (90 seconds) shows a PR, the review appearing, and a comment being resolved.

## Cross-Cutting Requirements (apply to every milestone)

- **Security:** signatures verified on every webhook. Tokens and keys never logged or committed. Parameterized queries only.
- **Testing:** pure logic (parser, config, signature, filtering, duplicate detection) has unit tests written first.
- **Cost:** no test calls the paid LLM API. Use the mock adapter.
- **Commits:** one conventional commit per milestone, for example `feat(api): verify GitHub webhook signatures`.
- **Reporting:** each milestone report lists every DoD item as pass or fail, with the command and output summary as evidence.
