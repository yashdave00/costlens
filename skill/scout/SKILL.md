---
name: scout
description: "Paid Scout tier — premium cloud/infra cost audit. Everything in the free cost-audit skill plus ready-to-use fix prompt templates, savings benchmarks by leak type, and 5 advanced checks (connection pooling, CDN caching headers, DB index recommendations, API rate-limiting cost, cold-start optimization). Use when the user asks for a deep cost audit, premium audit, scout tier, or wants actionable fix templates and benchmarks. Free version available at skill/cost-audit/SKILL.md."
---

# Cost Audit Skill — Scout (Paid Tier, $29)

> **This is the paid Scout tier.** Free version available at `skill/cost-audit/SKILL.md`.

You are performing a **premium cloud/infra cost audit** of the user's codebase. This tier delivers everything in the free audit **plus** ready-to-use fix prompt templates, savings benchmarks by leak type, and 5 advanced checks. Your goal: find cost leaks, estimate savings with benchmarked ranges, and produce a report the user (or another agent) can act on immediately — including copy-paste fix prompts.

## Operating principles

1. **Read-only first.** Scan and report before changing anything. Only edit files if the user explicitly asks you to apply fixes.
2. **Evidence-based.** Every finding must cite `file:line`. No vague "you should cache more."
3. **Language-agnostic.** The core checks (large files, binaries, secrets, dep counts) apply to any repo. Apply stack-specific checks only when the stack is present.
4. **Estimate savings honestly.** Use ranges ("10-1000×", "30-70%") and label them estimates, not guarantees. Cross-reference `benchmarks.md` for per-leak-type ranges.
5. **Agent-ready output.** Each finding includes a "Fix prompt" that can be pasted into an agent to auto-apply. End with a combined "Agent Fix Block."
6. **Premium deliverables.** Always include the Premium templates, Benchmark data, and Advanced rules sections (below) in the final report. These are what differentiate this tier.

## Phase 0 — Discover the project

Before scanning, understand the repo:

- List the root: `ls -la` or Glob for manifests.
- Identify manifests present: `package.json`, `requirements.txt`/`pyproject.toml`, `go.mod`, `Gemfile`, `composer.json`, `Cargo.toml`, `pom.xml`/`build.gradle`, `*.csproj`.
- Identify framework: Next.js (app/, pages/, next.config), Vite, Django, Rails, Laravel, Go HTTP, etc.
- Identify infra targets: Vercel (vercel.json), Supabase (supabase/ or @supabase imports), AWS, Dockerfile, k8s manifests.
- Count source files to size the audit.

State the detected stack in one line before proceeding.

## Phase 1 — General checks (any repo)

Run these with Grep/Glob/Read:

1. **Large committed files** — any tracked file > 500KB. (Use `find` via Bash or glob + size check.) Flag and recommend object storage / git-lfs.
2. **Binaries outside asset dirs** — image/video/archive/font files not under `public/`, `assets/`, `static/`, `images/`, `media/`. Flag.
3. **Committed secrets** — grep for `AKIA[0-9A-Z]{16}`, `sk-[A-Za-z0-9]{20,}`, `ghp_[A-Za-z0-9]{30,}`, `xox[baprs]-...`. **Critical severity.** Also flag `.env` files that are tracked.
4. **Committed build/dep dirs** — `node_modules/`, `vendor/`, `__pycache__/`, `.venv/`, `target/`, `dist/`, `build/` tracked. Flag.
5. **Duplicate filenames** — same basename appearing >5 times (copy-paste bloat).
6. **Dependency count** — count deps per manifest; flag if >60 (npm) / >40 (others).
7. **Heavy dependencies** — check manifests against the heavy-deps table below.

## Phase 2 — Stack-specific checks

Apply only the sections matching the detected stack.

### JavaScript / TypeScript (Next.js, Vite, Node)

- **N+1 queries:** any DB/ORM call (`.from(`, `.select(`, `prisma.`, `db.query`, `knex(`) appearing inside `for`/`while`/`forEach`/`.map(`/`.reduce(`/`.filter(` within ~10 lines. Flag each.
- **Missing caching:** `fetch(` calls without `cache:`/`revalidate:`/`next:` options in server code (not inside useEffect/onClick). Flag. Also: 5+ page/layout files with no `revalidate` anywhere → flag "no ISR."
- **Raw `<img>`:** `<img` tags not using `next/image` (Next.js). Flag.
- **Oversized public assets:** files in `public/` > 300KB that are images. Flag.
- **Heavy client bundles:** `"use client"` files importing moment/lodash/chart.js/d3/three/xlsx/pdf-lib/firebase/aws-sdk. Flag.
- **Heavy serverless routes:** files under `app/api/`, `pages/api/`, `routes/`, `functions/` importing puppeteer/playwright/sharp/canvas/xlsx/aws-sdk/firebase-admin/stripe. Flag.
- **Sync blocking calls in routes:** `readFileSync`/`writeFileSync`/`execSync`/`spawnSync` in API routes. Flag.
- **Barrel `export *`:** `index.*` files with `export * from`. Flag (tree-shaking risk).

### Supabase (if @supabase/supabase-js present)

- `select("*")` or `.select("*")` → flag (egress).
- `.select(` without `.limit(` / `.single()` / `.maybeSingle()` → flag (unbounded).
- `.channel(` / realtime subscribe → flag if >5 (connection cost).
- `getPublicUrl`/`createSignedUrl` without transform options → flag.

### Python

- Heavy deps: pandas (→polars/duckdb), tensorflow (→torch/onnxruntime for inference), scipy, matplotlib (headless), requests (→httpx), boto3 (targeted clients).
- Sync I/O in async handlers (e.g., `requests.get` inside async FastAPI/Django views).
- Missing caching on expensive calls (`@lru_cache`, `functools.cache`, Redis).

### Go

- `http.Get` in loops, missing connection pooling, large `io.ReadAll` on unbounded responses.

### Ruby / Rails

- N+1 (missing `includes`/`preload`), heavy gems, missing fragment caching, `render` in loops.

### PHP / Laravel

- N+1 (missing `with()`/eager loading), missing route caching, missing config caching, heavy composer deps.

### Rust / Java

- Dep count, heavy crates/deps, blocking in async, missing connection pooling.

## Phase 3 — Heavy-deps reference table

| Ecosystem | Heavy | Lighter alternative |
|---|---|---|
| npm | moment | date-fns / dayjs |
| npm | lodash | native JS or `lodash/*` subpaths |
| npm | axios | native fetch |
| npm | request | native fetch |
| npm | node-fetch | native fetch (Node 18+) |
| npm | uuid | crypto.randomUUID() |
| npm | chalk | picocolors |
| npm | moment-timezone | date-fns-tz / Intl |
| pip | pandas | polars / duckdb |
| pip | tensorflow | torch / onnxruntime (inference) |
| pip | matplotlib | headless / plotly |
| pip | requests | httpx |
| pip | boto3 | targeted clients |
| ruby | rails (microservices) | sinatra / roda |

## Phase 4 — Produce the report

Use this exact structure (markdown). Group findings by severity: 🔴 critical, 🟠 high, 🟡 medium, 🔵 low.

```
# Cost Audit Report — {project} — {date}

## Summary
- Stack detected: {stack}
- Files scanned: {N}
- Findings: {total} (critical:{c}, high:{h}, medium:{m}, low:{l})
- Estimated monthly savings: ${low}-${high}

## 🔴 CRITICAL
### {title}
{detail}
**Locations:** file:line, ...
**Estimated impact:** ...
**Fix prompt:** ``` ... ```

## 🟠 HIGH
...

## 🟡 MEDIUM
...

## 🔵 LOW
...

## 🤖 Agent Fix Block
```You are a senior engineer optimizing this codebase for cloud/infra cost. Apply these fixes, smallest safe change first, run build/tests after each group:
- {fixPrompt 1}
- {fixPrompt 2}
...
```

## Verification plan
How to confirm savings after fixes (e.g., re-run scan, check Vercel function size, DB query count, bandwidth).

## Next steps
- Quick wins this week
- Medium effort
- Larger refactors
```

### Premium templates (Scout tier)

Include a "Premium fix templates" section in the report with the 5 ready-to-use fix prompt templates below. Each is copy-pasteable into a coding agent. Full before/after code lives in `templates.md`.

1. **N+1 batch fix** — convert looped single-row fetches into one batched query (`.in()` / `whereIn` / join).
2. **Caching strategy** — add `revalidate`/`cache` to `fetch`, ISR on pages, fragment caching.
3. **Bundle split** — dynamic `import()` for heavy libs, move server-only code out of client bundles, tree-shake barrels.
4. **Supabase column selection** — replace `select("*")` with explicit columns + `.limit()`/`.single()`.
5. **Image optimization** — swap `<img>` for `next/image`, resize/compress, modern formats, CDN transforms.

For each finding, attach the matching template's "Fix prompt" verbatim (customized with file:line) rather than a one-liner.

### Benchmark data (Scout tier)

Cross-reference savings estimates against `benchmarks.md`. Report the typical range per leak type:

| Leak type | Typical savings |
|---|---|
| N+1 fixes | 10-1000× query reduction |
| ISR / caching | 90%+ invocation reduction |
| Image optimization | 30-70% bandwidth reduction |
| Bundle trimming | 20-60% smaller bundles, 40-80% faster cold starts |
| Supabase column selection | 50-90% egress reduction |
| Dependency removal | 10-40% smaller functions |
| Heavy-dep swap | 20-60% bundle shrink |

Always cite the range, not a point estimate, and label as estimate.

### Advanced rules (Scout tier)

In addition to the free checks, run these 5 advanced checks and report findings under a dedicated "Advanced (Scout)" group:

1. **Connection pooling** — DB/Supabase/Postgres clients created per request or per file instead of a singleton; missing pooled connection string (pgbouncer) for serverless; `createClient` inside handlers. Flag. Estimate: pooling can cut connection errors 90%+ and reduce DB compute.
2. **CDN caching headers** — static/API responses missing `Cache-Control`, `stale-while-revalidate`, or `immutable` for hashed assets; no `Vercel-CDN-Cache-Control`. Flag. Estimate: proper headers cut origin load 60-95%.
3. **DB index recommendations** — filters/sorts on columns likely unindexed (foreign keys, `user_id`, `created_at`, `status`, `email`); missing composite indexes for common (status, created_at) pairs; sequential-scan risk on large tables. Flag as advisory (requires EXPLAIN to confirm). Estimate: 10-100× query speedup, lower DB CPU.
4. **API rate limiting cost** — public endpoints without rate limiting / auth → abuse-driven runaway compute & egress; missing middleware (upstash ratelimit, express-rate-limit, Django throttling). Flag. Estimate: prevents unbounded spend; a single abuse incident can 10-100× a bill.
5. **Cold start optimization** — heavy top-level imports in serverless entrypoints, no dynamic imports for heavy libs, oversized dependency graph; recommend code splitting, lazy init, and smaller runtime. Flag. Estimate: 30-70% cold-start reduction.

## Phase 5 — Offer next steps

After delivering the report, ask the user:

> "Want me to apply the quick wins now (I'll open a branch and PR the top 3 fixes), or just leave the report? I can also estimate your new monthly bill if you share current spend."

If the user wants fixes applied, apply them in small commits, running tests after each.

## Severity guide

- **critical:** committed secrets, committed `.env` with values, committed `node_modules`/`vendor`.
- **high:** N+1 queries, heavy deps in serverless routes, large committed files (>1MB), heavy client bundles.
- **medium:** missing caching, Supabase `select("*")`, raw `<img>`, oversized public assets, heavy dep in manifest, high dep count, sync blocking calls.
- **low:** barrel `export *`, large source files (>1000 lines), duplicate filenames, realtime overuse, missing `.limit()`.

Advanced (Scout) findings default to **medium** unless they expose secrets or unbounded spend (then high).

## False-positive handling

Heuristic scanning produces false positives. Always:

- Show the matched line so the user can verify.
- Use hedging language ("possible", "likely").
- If the user says a finding is wrong, acknowledge and note the rule to refine.

## Safety

- Never commit or push without explicit user request.
- Never print secret values in the report — redact them (show only file:line and pattern name).
- Never exfiltrate code. All analysis stays local.

## Deliverables checklist (Scout tier)

Before finishing, confirm the report includes:

- [ ] Standard audit (Phases 0-4) with all free-skill findings
- [ ] Premium fix templates section (5 templates, customized)
- [ ] Benchmark data section (ranges per leak type)
- [ ] Advanced rules section (5 checks)
- [ ] Note: "This is the paid Scout tier. Free version available at skill/cost-audit/SKILL.md"
- [ ] References to `templates.md` and `benchmarks.md` for full detail