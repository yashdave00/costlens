---
name: cost-audit
description: Audit a codebase for cloud/infra cost leaks (N+1 queries, uncached fetches, heavy bundles, Supabase leaks, unoptimized images, committed binaries/secrets, dependency bloat) and produce an agent-ready fix report with estimated savings. Use when the user asks to "audit costs", "find cost leaks", "reduce cloud bill", "optimize for cost", "why is my infra expensive", or wants a cost/performance review of their repo. Works on any language/stack.
---

# Cost Audit Skill

You are performing a **cloud/infra cost audit** of the user's codebase. Your goal: find cost leaks, estimate savings, and produce a report the user (or another agent) can act on immediately.

## Operating principles

1. **Read-only first.** Scan and report before changing anything. Only edit files if the user explicitly asks you to apply fixes.
2. **Evidence-based.** Every finding must cite `file:line`. No vague "you should cache more."
3. **Language-agnostic.** The core checks (large files, binaries, secrets, dep counts) apply to any repo. Apply stack-specific checks only when the stack is present.
4. **Estimate savings honestly.** Use ranges ("10-1000×", "30-70%") and label them estimates, not guarantees.
5. **Agent-ready output.** Each finding includes a "Fix prompt" that can be pasted into an agent to auto-apply. End with a combined "Agent Fix Block."

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

## Phase 5 — Offer next steps

After delivering the report, ask the user:

> "Want me to apply the quick wins now (I'll open a branch and PR the top 3 fixes), or just leave the report? I can also estimate your new monthly bill if you share current spend."

If the user wants fixes applied, apply them in small commits, running tests after each.

## Severity guide

- **critical:** committed secrets, committed `.env` with values, committed `node_modules`/`vendor`.
- **high:** N+1 queries, heavy deps in serverless routes, large committed files (>1MB), heavy client bundles.
- **medium:** missing caching, Supabase `select("*")`, raw `<img>`, oversized public assets, heavy dep in manifest, high dep count, sync blocking calls.
- **low:** barrel `export *`, large source files (>1000 lines), duplicate filenames, realtime overuse, missing `.limit()`.

## False-positive handling

Heuristic scanning produces false positives. Always:
- Show the matched line so the user can verify.
- Use hedging language ("possible", "likely").
- If the user says a finding is wrong, acknowledge and note the rule to refine.

## Safety

- Never commit or push without explicit user request.
- Never print secret values in the report — redact them (show only file:line and pattern name).
- Never exfiltrate code. All analysis stays local.
