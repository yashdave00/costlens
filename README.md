# CostLens

**Free, open-source scanner for cloud/infra cost leaks in your codebase.**
Built for the vibe-coding era: paste the report into Claude Code / Cursor and it fixes everything.

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

CostLens finds the obvious leaks. If you want someone to actually fix them — and guarantee savings — I offer a **Deep Codebase Cost Audit**:

- **$199 — Standard:** full scan + manual review + prioritized fix list with effort estimates.
- **$499 — Deep:** above + I open PRs for the top fixes + before/after cost estimate + 30-day follow-up.

Turnaround 24–48h. You keep the code. [Book here →](#)  *(Gumroad link)*

## Contributing

PRs welcome. Add a rule in `src/rules/` — export `name` and `run({root, files, fileContents})`.

## License

MIT
