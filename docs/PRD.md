# PRD: AI Pull Request Reviewer

**Status:** Draft v1.0
**Owner:** Bipro Roy
**Last updated:** 2026-11-16

## 1. Summary

The AI Pull Request Reviewer is a GitHub App that reviews pull requests when they open or change. It posts inline comments for likely bugs, security issues, error-handling gaps, and missing tests. Each repository controls what the reviewer checks through a configuration file. A dashboard shows review history, comment outcomes, and cost.

The main promise is comments worth reading. Every numeric target in this document is a proposal, to be confirmed with a baseline measurement during the first evaluation cycle.

## 2. Problem Statement

Code review is slow, uneven, and often rushed. Reviewers miss routine defects such as unparameterized queries, unhandled promise rejections, and off-by-one errors, because they are also checking design. Small teams and solo developers often have no second reviewer at all.

Existing AI review tools post many comments, and many are style nitpicks. Developers learn to ignore the bot, and a bot that is ignored provides no value.

## 3. Goals and Non-Goals

### Goals

- **G1.** Catch common, high-impact defects on pull requests before merge.
- **G2.** Keep noise low: developers should act on most comments the reviewer posts.
- **G3.** Let each repository define what matters, through a file in the repository.
- **G4.** Measure review quality openly, using a published benchmark.
- **G5.** Keep cost per review predictable and visible.

### Non-Goals

- Replacing human review. The reviewer comments; it never approves, requests changes, or blocks merges in v1.
- Enforcing formatting or style. Linters and formatters already do this.
- Reviewing languages outside the supported list in v1.
- Auto-fixing code or pushing commits.
- Reviewing private repositories of organizations that have not installed the app.

## 4. Target Users

| Persona | Description | Main need |
|---|---|---|
| Solo developer | Maintains personal or side-project repositories with no second reviewer | A second set of eyes on risky changes |
| Small team lead | Leads 3 to 8 engineers; review is a bottleneck | Catch routine defects so humans focus on design |
| Engineer | Opens pull requests daily | Fast, specific, actionable comments with few false alarms |
| Security-minded reviewer | Cares about injection, secrets, and authorization | Consistent checks for security categories |

## 5. User Stories

- As a **repository admin**, I want to install the app on selected repositories, so that only the repositories I choose get reviewed.
- As a **repository admin**, I want to define review rules in a file in my repository, so that the reviewer enforces our conventions.
- As an **engineer**, I want inline comments on the exact lines with issues, so that I can act without searching the diff.
- As an **engineer**, I want lockfiles and generated files ignored, so that comments focus on code I wrote.
- As an **engineer**, I want a fresh review after I push fixes, without seeing the same comment twice.
- As an **engineer**, I want to mark a comment as not useful, so that the reviewer stops repeating a false positive.
- As an **admin**, I want to see review volume, cost, and how often comments were acted on, so that I can judge whether the reviewer is worth keeping.

## 6. Functional Requirements

### 6.1 Installation and Access

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Users can install the GitHub App on all or selected repositories | Must |
| FR-2 | The app requests read access to contents and metadata, and read and write access to pull requests, and nothing more | Must |
| FR-3 | Uninstalling the app stops all reviews and marks the installation inactive | Must |
| FR-4 | Users sign in to the dashboard with GitHub OAuth and see only installations they can access | Must |

### 6.2 Review Triggering

| ID | Requirement | Priority |
|---|---|---|
| FR-5 | A pull request is reviewed on `opened`, `reopened`, and `synchronize` events | Must |
| FR-6 | Draft pull requests are skipped unless the configuration enables them | Should |
| FR-7 | Pull requests from forks are skipped by default, since comments cannot be safely posted there | Must |
| FR-8 | A user can request a manual review by commenting `/review` on a pull request | Should |
| FR-9 | Each commit (head SHA) is reviewed at most once | Must |

### 6.3 Review Generation

| ID | Requirement | Priority |
|---|---|---|
| FR-10 | Review only added and modified lines, plus the surrounding context needed to understand them | Must |
| FR-11 | Skip files matching `ignore_paths`, and files classified as generated or minified | Must |
| FR-12 | Each finding includes path, line, category, confidence, and message | Must |
| FR-13 | Categories in v1: `bug`, `security`, `error_handling`, `test`, and `style` (style disabled by default) | Must |
| FR-14 | Drop findings below the configured confidence threshold | Must |
| FR-15 | Cap comments per review at the configured maximum, ordered by severity and confidence | Must |
| FR-16 | If the diff exceeds the context budget, review the highest-risk files first and list the skipped files | Must |
| FR-17 | Validate every finding's line against the diff before posting. Invalid findings are stored but not posted | Must |

### 6.4 Posting

| ID | Requirement | Priority |
|---|---|---|
| FR-18 | Post all inline comments as one review with event `COMMENT` | Must |
| FR-19 | Include a summary comment with finding counts, skipped files, and a link to the run in the dashboard | Should |
| FR-20 | Never post a partial review. If posting fails, retry, then mark the run failed | Must |
| FR-21 | On a new commit, do not repeat a comment already posted with the same path, line, and message | Must |

### 6.5 Configuration

| ID | Requirement | Priority |
|---|---|---|
| FR-22 | Read `.reviewbot.yml` from the default branch, never from the pull request's branch | Must |
| FR-23 | Support `focus`, `ignore_paths`, `min_confidence`, `max_comments`, `draft_reviews`, and `rules` | Must |
| FR-24 | Validate configuration against a schema. An invalid file falls back to defaults and the summary names the problem | Must |
| FR-25 | Custom `rules` are free-text instructions added to the review prompt | Must |

### 6.6 Feedback Loop

| ID | Requirement | Priority |
|---|---|---|
| FR-26 | Record whether each posted comment was resolved, replied to, or left untouched | Should |
| FR-27 | A developer can mark a comment "not useful" with a reply command, stored for evaluation | Could |
| FR-28 | Report acceptance rates per category from recorded feedback | Should |

### 6.7 Dashboard

| ID | Requirement | Priority |
|---|---|---|
| FR-29 | List installations and repositories with status and last review time | Must |
| FR-30 | List review runs per repository with status, head SHA, cost, and token count | Must |
| FR-31 | Run detail page shows each finding, whether it was posted, and why it was filtered if not | Must |
| FR-32 | Show monthly cost and review volume per installation | Should |
| FR-33 | Show acceptance rate by category over a selected time range | Should |
| FR-34 | Allow a monthly spending cap per installation | Should |

## 7. Non-Functional Requirements

| Area | Requirement | Target (to validate) |
|---|---|---|
| Latency | Webhook acknowledgement | Under 1 second, 99th percentile |
| Latency | Review completion for a PR under 500 changed lines | Under 3 minutes, 90th percentile |
| Reliability | Each webhook delivery processed at least once, with no duplicate reviews | 100% of deliveries accounted for |
| Reliability | Failed reviews retried automatically | Up to 3 attempts, exponential backoff |
| Scalability | Concurrent review workers | Scale by adding workers, no code changes |
| Cost | Average cost per review | Documented, with an alert above target |
| Security | Webhook signatures verified on every request | 100% |
| Security | Installation tokens never logged or stored | Enforced by a log-redaction test |
| Privacy | Only changed hunks and rules sent to the LLM provider | Verified by a test that inspects the outgoing prompt |
| Observability | Each run records duration, token counts, skipped files, and error codes | Available in logs and dashboard |
| Accessibility | Dashboard meets WCAG 2.1 AA for contrast and keyboard navigation | Checked before release |

## 8. Review Quality Policy

**Comment on:**
- Logic errors that produce wrong results
- Security issues: injection, unsafe deserialization, hardcoded secrets, missing authorization checks
- Unhandled errors, unhandled promise rejections, and missing `await`
- New public behavior with no test
- Resource leaks, such as unclosed connections or files

**Do not comment on:**
- Formatting, naming, or style, unless `style` is enabled
- Speculative issues with no evidence in the diff
- Code outside the changed lines, except as context
- Issues a linter or type checker already reports

**Confidence rules:**
- The model returns a confidence score per finding.
- Findings below `min_confidence` (default 0.7) are stored but not posted.
- Each finding cites a specific line and explains the failure in one or two sentences.

## 9. User Flows

**A. Installation.** Admin installs the app and selects repositories. The system creates the installation record. The dashboard shows repositories as "Active, no reviews yet."

**B. Review on open.** Engineer opens a pull request. The webhook is verified and enqueued, and GitHub receives `202`. The worker loads configuration from the default branch, fetches changed files, reviews eligible files, validates lines, filters by confidence, and posts one review. The run appears as `posted`.

**C. New commit.** Engineer pushes fixes. The worker reviews the new head commit. Duplicates are skipped. The summary states how many comments are new.

**D. Invalid configuration.** The worker uses defaults. The summary names the invalid field. The dashboard flags the repository "Configuration error."

**E. Large diff.** The worker ranks files by risk, reviews as many as fit, and lists the skipped files and reasons.

## 10. Edge Cases and Error Handling

| Case | Expected behavior |
|---|---|
| Duplicate webhook delivery | Detected by delivery ID or the unique commit constraint. No second review |
| PR closed while job queued | Job checks state first and marks the run `skipped` |
| Force-push removes reviewed commit | Review the new head. Old comments on removed lines are left alone |
| Finding's line not in diff | Store as not posted, reason `line_not_in_diff`. Other findings still post |
| LLM returns invalid JSON | Retry once with a stricter prompt. If still invalid, mark the file failed and continue |
| LLM timeout or rate limit | Retry with backoff. After 3 attempts, mark the run failed and post nothing |
| GitHub rate limit | Respect `Retry-After`. Pause that installation's queue |
| Binary file in diff | Skip, reason `binary` |
| Repository deleted or access revoked | Stop reviews, mark repository inactive |
| Pull request from a fork | Skip by default, record the reason |
| Prompt injection in code or PR text | Treated as data. Output format enforced by schema validation |
| Installation token expires mid-job | Fetch a new token and retry the current step |

## 11. Privacy, Security, and Data Retention

- **Sent to the LLM provider:** changed hunks, surrounding context, and configuration rules. Full repository contents are not sent.
- **Stored:** run metadata, findings, and posted comment IDs. Stored diffs are kept 14 days for debugging, then deleted.
- **Secrets:** installation tokens and the app private key live in a secrets manager, never in the database or logs.
- **Deletion:** uninstalling deletes that installation's runs and findings within 30 days. Users can request earlier deletion.
- **Disclosure:** the README and install page state that code is sent to a third-party LLM provider, and name the provider.
- **Access control:** dashboard queries are scoped to installations the signed-in user can access, checked on every query.

## 12. Success Metrics

| Metric | Definition | Proposed target |
|---|---|---|
| Precision | Share of posted comments labeled correct | 60% or higher, set after baseline |
| Acceptance rate | Share of posted comments resolved or replied to | Tracked; target set after baseline |
| Recall on planted bugs | Share of seeded defects flagged on the correct line | 70% or higher |
| Noise | Style or speculative comments per review | Under 1 on average |
| Median review time | Time to post for PRs under 300 changed lines | Under 90 seconds |
| Failed review rate | Share of runs failed | Under 2% |
| Duplicate comment rate | Repeated comments on the same path, line, and message | 0% |

**Analytics events:** `review_started`, `review_completed`, `review_failed`, `finding_filtered` (with reason), `comment_posted`, `comment_resolved`, `comment_replied`, `comment_marked_not_useful`, `config_invalid`.

## 13. Evaluation Plan

- **Planted-bug benchmark:** about 30 seeded defects across the five categories, with known locations, so recall and precision are measured the same way each release.
- **Real-PR replay:** merged pull requests from open-source projects where a bug was fixed in a later commit.
- **Labeling:** the developer labels each posted comment as correct, incorrect, or style. Two labelers on a sample of 100 comments, with agreement reported as Cohen's kappa.
- **Reporting:** a results table per release with precision, recall, noise, cost, and number of pull requests evaluated.

## 14. Technical Overview

- **API:** NestJS. Webhook, installation, run, and metrics endpoints.
- **Queue:** BullMQ on Redis, one job per review.
- **Worker:** same codebase as the API, separate process. Fetches diffs, calls the LLM, validates findings, posts reviews.
- **Database:** PostgreSQL. Installations, repositories, review runs, findings.
- **Dashboard:** Next.js with GitHub OAuth sign-in.
- **LLM provider:** one provider in v1, behind an adapter so it can be replaced.

## 15. Release Plan

**MVP (Milestones 1 to 5):** installation, webhook handling, review of the four core categories, line validation, one review per commit, duplicate prevention, default configuration only.
*Exit:* runs successfully on three of your own repositories for two weeks, with no duplicate reviews and no unretried failed postings.

**v1 (Milestones 6 to 8):** `.reviewbot.yml` with validation and fallback, dashboard, published planted-bug benchmark, spending cap, feedback states.
*Exit:* benchmark results published in the README with precision and recall.

**Later:** more languages, `/review` command, "not useful" command, per-category confidence tuning, multi-model comparison, failure notifications.

## 16. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Too many low-value comments; developers ignore the bot | High | High | Confidence threshold, comment cap, no style by default, measured precision |
| Model misses bugs it should catch | High | Medium | Publish recall honestly; document blind spots |
| Line validation errors lose whole reviews | Medium | High | Validate each line, drop only invalid findings, parser tests |
| Prompt injection from PR content | Medium | High | Treat input as data, schema-validated output, injection test cases |
| Cost grows with large PRs | Medium | Medium | Context budget, file ranking, skipped-file reporting, spending cap |
| Established competitors | High | Medium | Differentiate on measured precision, configurable rules, transparent evaluation |
| Concern about code sent to third party | Medium | Medium | Disclosure, minimal data, retention limits, self-hosting option later |
| GitHub API rate limits | Low | Medium | Respect `Retry-After`, per-installation queue pausing |

## 17. Open Questions

1. Which LLM provider for v1, and does the cost fit the spending cap?
2. Should `style` comments exist at all? If yes, off by default or in a summary only?
3. Does 14-day diff retention match the privacy promise?
4. Should the reviewer post on draft pull requests by default?
5. What minimum precision would make the team keep the reviewer? Decide this before the first benchmark.
6. Should the reviewer run on forks where the fork owner installed the app?

## Appendix A: Configuration Schema

```yaml
# .reviewbot.yml (all fields optional; defaults shown)
focus: [bug, security, error_handling, test]
ignore_paths: ["**/*.lock", "dist/**", "**/*.generated.*"]
min_confidence: 0.7        # 0.0 to 1.0
max_comments: 10           # 1 to 30
draft_reviews: false
rules:
  - "Every database query must use parameters."
  - "Every new public function needs a test."
```

Validation: `min_confidence` between 0 and 1; `max_comments` between 1 and 30; `focus` values from the supported category list; at most 20 rules, each up to 300 characters.

## Appendix B: Out of Scope for v1

- Automatic fixes or suggested commits
- Blocking merges or requesting changes
- Reviewing private repositories without installation
- Languages beyond the initial list
- Self-hosted LLM deployment
- Organization-wide policy management
