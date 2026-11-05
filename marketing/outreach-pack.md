# Outreach Copy Pack — CostLens

## 1. Show HN post (post Tuesday/Wednesday 9am PT)

**Title:** Show HN: CostLens – free scanner for cloud cost leaks in your codebase (paste report into Claude to fix)

**Body:**
```
I built CostLens after watching vibe-coded apps ship fast and burn money quietly:
N+1 queries, uncached fetches, heavy deps (moment/lodash/puppeteer) in serverless
bundles, Supabase select("*"), unoptimized images, committed binaries.

It's a zero-config CLI: `npx costlens scan .` walks your repo and emits a markdown
report grouped by severity. Each finding has file:line, estimated impact, and a
"fix prompt" you can paste straight into Claude Code / Cursor to auto-apply. There's
also a combined "Agent Fix Block" at the end.

Rules are pluggable (src/rules/). Core is language-agnostic (large files, binaries,
secrets, dep counts across npm/pip/go/ruby/php/rust/java) plus deep JS/TS rules.

Repo: https://github.com/YOURUSER/costlens
npm: npx costlens scan .

I also offer paid audits (Scout $29, Probe $99, Investigate $199, Architect $2000) where I fix the top leaks and open PRs —
but the scanner is free and MIT. Feedback on false positives welcome; that's the
biggest risk with heuristic scanning.
```

**Tips:** Reply to every comment in first 2 hours. Have the GitHub repo public with a good README and a demo GIF. Don't mention the paid audit in the title.

---

## 2. Reddit posts

### r/SideProject
Title: I built a free CLI that scans your codebase for cloud cost leaks (and writes the fix prompts for Claude)
Body: (adapt Show HN body, shorter, friendlier; end with "would love feedback on false positives")

### r/nextjs
Title: Free tool: scan your Next.js app for cost leaks (uncached fetches, heavy bundles, <img>, serverless bloat)
Body: Focus on Next-specific findings. Mention npx costlens scan.

### r/webdev
Title: Open source: cost-leak scanner for web apps (N+1, caching, bundles, images)
Body: General.

### r/indiehackers
Title: I shipped a free cost-leak scanner for vibe-coded apps — looking for first audit customers
Body: Include the tiered audit offer (Scout $29 / Probe $99 / Investigate $199 / Architect $2000) and the savings guarantee. IndieHackers allows self-promo in milestones.

### r/ExperiencedDevs
Title: Heuristic codebase cost scanner — looking for feedback on rule quality
Body: Technical tone; ask about false positives.

### r/supabase
Title: Free scanner flags Supabase select("*"), missing .limit(), realtime overuse
Body: Supabase-specific.

---

## 3. X / Twitter thread

1/ I shipped a free, open-source CLI that scans your codebase for cloud cost leaks.
2/ npx costlens scan .  → markdown report, grouped by severity, with file:line.
3/ Each finding ships a "fix prompt" you paste into Claude Code / Cursor to auto-apply. There's a combined Agent Fix Block at the end.
4/ Catches: N+1 queries, uncached fetches, heavy deps in bundles, Supabase select("*"), raw <img>, committed binaries/secrets, dep bloat across npm/pip/go/ruby/php/rust/java.
5/ Rules are pluggable JS modules. PRs welcome.
6/ Free & MIT. If you want me to actually fix the leaks: audits from $29 to $2000 with a savings guarantee. Link in bio.
[attach demo GIF]

---

## 4. LinkedIn DM templates (to founders of SaaS / apps)

**Template A — short:**
> Hey {name}, saw you're building {product}. I built a free scanner that finds cloud cost leaks (N+1, uncached fetches, heavy bundles, Supabase leaks) and writes fix prompts for Claude/Cursor. Happy to run it on your repo and send the report — no charge. Want me to?

**Template B — if they engage:**
> Ran it on your repo (with your permission). Found {N} leaks, top one saves ~${X}/mo. Full report attached. If you want me to actually fix the top 3 and open PRs, I do a tiered audit (Investigate $199 with PRs for top 3, Architect $2000 with full architecture review + 30-day follow-up + savings guarantee). Either way, the report is yours.

**Rules:** Only DM people you can personalize for. Never send the same message twice. 20 DMs/day max to avoid LinkedIn limits.

---

## 5. Upwork gig draft

**Title:** Codebase Performance & Cloud Cost Audit (Next.js, Supabase, Vercel, Node)

**Description:**
I audit your codebase for performance and cloud cost leaks and deliver a prioritized fix list with effort estimates and before/after cost projections.

What I check:
- N+1 queries and unbounded DB calls
- Missing caching / ISR on fetches
- Heavy dependencies in client & serverless bundles
- Supabase: select("*"), missing limits, realtime overuse
- Image optimization (raw <img>, oversized assets)
- Committed binaries, secrets, dep bloat

Deliverables:
- Markdown audit report (file:line references)
- Prioritized fix list with effort + expected savings
- PRs for top fixes on Investigate and Architect tiers

Tiers:
- Scout $29 — CostLens agent skill + curated fix templates + benchmark data + advanced rules (self-serve)
- Probe $99 — Everything in Scout + full cloud cost audit (IAM-based preferred, CSV fallback). Top-5 waste categories with $ estimates, right-sizing recs, RI/SP suggestions. 48h turnaround.
- Investigate $199 — Everything in Probe + code↔cloud correlation + DB query review (N+1, indexes, unbounded queries) + PRs for top 3 fixes.
- Architect $2000 — Everything in Investigate + full architecture review (cost, latency, throughput) + PRs for top fixes + 30-day follow-up + 1h call + savings guarantee.

Tools: I use a custom scanner (CostLens) plus manual review. You keep all code.

**Skills tags:** Code Review, Performance Optimization, Next.js, Supabase, Vercel, Node.js, Cost Optimization

---

## 6. Gumroad product page copy (Codebase Cost Audit)

**Title:** Codebase Cost Audit — Scout $29 · Probe $99 · Investigate $199 · Architect $2000

**Description:**
Your app ships fast. Your cloud bill ships faster. I'll find the leaks and fix them.

What you get:
- **Scout ($29):** CostLens agent skill + curated fix templates + benchmark data + advanced rules. Self-serve.
- **Probe ($99):** Everything in Scout + full cloud cost audit (IAM-based preferred, CSV fallback). Top-5 waste categories with $ estimates, right-sizing recs, RI/SP suggestions. 48h turnaround.
- **Investigate ($199):** Everything in Probe + code↔cloud correlation + DB query review (N+1, indexes, unbounded queries) + PRs for top 3 fixes.
- **Architect ($2000):** Everything in Investigate + full architecture review (cost, latency, throughput) + PRs for top fixes + 30-day follow-up + 1h call + savings guarantee.

How it works:
1. Buy → you get an intake form (repo access method).
2. I audit.
3. You receive the report (+ PRs on Investigate/Architect).
4. You merge, deploy, watch the bill drop.

Stacks I know best: Next.js, Supabase, Vercel, Node, Python. Other stacks on request.

**FAQ:**
- Do you need prod access? No. Read-only repo access (GitHub invite or zip) is enough.
- Is my code safe? Yes — I don't store or share it; report only.
- What if savings < $200/mo? Full refund on the Architect tier.

---

## 7. Audit delivery template (markdown)

# Cost Audit Report — {client} — {date}

## Summary
- Leaks found: {N}
- Estimated monthly savings: ${X} (range ${low}-${high})
- Top 3 fixes account for {Y}% of savings

## Findings (prioritized)
For each: severity, file:line, problem, fix, effort (S/M/L), estimated savings, code snippet.

## Quick wins (do this week)
## Medium effort
## Larger refactors
## What I changed (Investigate/Architect tier: PR links)
## Verification plan (how to confirm savings)
## Next steps
