# CostLens

**Free, open-source cost-leak audit — as an agent skill AND a CLI.**
Built for the vibe-coding era. Distribution is agent-native: install the skill into
Claude Code / Cursor / Codex and run `/cost-audit`, or use the standalone CLI.

- **Agent skill (primary):** `skill/cost-audit/SKILL.md` — drop into `~/.claude/skills/` (or your agent's skills dir). Works on any codebase, any language, inside your agent.
- **CLI (companion):** `npx costlens scan .` — standalone, no agent needed.

[![npm](https://img.shields.io/npm/v/costlens)](https://npmjs.com/package/costlens)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Why

Vibe-coded apps ship fast and burn money quietly: N+1 queries, uncached fetches, heavy deps in serverless bundles, unoptimized images, `select("*")`, committed binaries. CostLens finds them in seconds and gives you an **agent-ready fix prompt** for each.

## Quick start

```bash
npx costlens scan .
# or install
npm i -g costlens
costlens scan ./my-app -o report.md
```

## What it checks (language-agnostic + deep JS/TS rules)

- **General (any repo):** large committed files, binaries outside asset dirs, committed secrets, committed `node_modules`/`vendor`, duplicate files.
- **Manifests (npm/pip/go/ruby/php/rust/java):** dependency count, heavy deps (moment, lodash, pandas, tensorflow, rails…).
- **JS/TS deep:** N+1 query patterns, missing caching on `fetch`, raw `<img>` vs `next/image`, oversized public assets, heavy libs in client/serverless bundles, Supabase `select("*")` / missing `.limit()`, sync blocking calls in routes, barrel `export *`.

## Output

Markdown report grouped by severity, each finding with file:line, estimated impact, and a **fix prompt** you can paste straight into your coding agent. Also `--json`.

## Want a human (AI-assisted) deep dive?

CostLens finds the obvious leaks. If you want someone to actually fix them — and guarantee savings — I offer a tiered **Codebase Cost Audit**:

- **Scout ($29):** CostLens agent skill + curated fix templates + benchmark data + advanced rules. Self-serve.
- **Probe ($99):** Everything in Scout + full cloud cost audit (IAM-based preferred, CSV fallback). Top-5 waste categories with $ estimates, right-sizing recs, RI/SP suggestions. 48h turnaround.
- **Investigate ($199):** Everything in Probe + code↔cloud correlation + DB query review (N+1, indexes, unbounded queries) + PRs for top 3 fixes.
- **Architect ($2000):** Everything in Investigate + full architecture review (cost, latency, throughput) + PRs for top fixes + 30-day follow-up + 1h call + savings guarantee.

You keep the code. [Book here →](#)  *(Gumroad link)*

## Contributing

PRs welcome. Add a rule in `src/rules/` — export `name` and `run({root, files, fileContents})`.

## License

MIT
