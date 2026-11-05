# 4-Day Break-Even Action Plan — CostLens

**Target: 4 Scout sales ($29 each) in 4 days = $116 gross / ~$104 net → break even.**

Why Scout: the free CLI/skill gets attention, but attention doesn't pay. Scout is the
low-friction impulse buy — priced under the "do I need approval?" line, delivered
async, near-zero delivery time. Probe/Investigate/Architect are upside, not the plan.

## Pricing (4 tiers)

| Tier | Price | What the buyer gets | Delivery |
| --- | --- | --- | --- |
| **Scout** | **$29** | CostLens agent skill + curated fix templates + benchmark data + advanced rules. Self-serve, no human review. | Instant |
| **Probe** | **$99** | Everything in Scout + full cloud cost audit (IAM-based preferred, CSV fallback), top-5 waste categories with $ estimates, right-sizing and RI/SP recommendations. | 48h |
| **Investigate** | **$199** | Everything in Probe + code↔cloud correlation, DB query review (N+1, indexes, unbounded queries), PRs for the top 3 fixes. | 3-5 days |
| **Architect** | **$2000** | Everything in Investigate + full architecture review (cost, latency, throughput), PRs for top fixes, 1h call, 30-day follow-up, savings guarantee (≥$200/mo found or refund). | 1-2 weeks |

Scout is the funnel: every Scout buyer is a warm lead for a Probe/Investigate upsell.
Never discount Architect below $2000; instead offer to apply a Scout purchase as credit.

## Pre-requisites (do once, ~1 hour)
- [ ] Create GitHub account + repo `costlens`, push this code (`git remote add origin ... && git push -u origin master`)
- [ ] Create npm account, `npm login`, then `npm publish` (makes `npx costlens` work). Free.
- [ ] Create Gumroad account (free). Create **four** products matching `landing/index.html`: Scout $29, Probe $99, Investigate $199, Architect $2000. Then update `marketing/outreach-pack.md` §5-§6, which still lists the old Standard $199 / Deep $499 tiers. Get each product URL → paste into the placeholder `gumroad.com/l/YOURPRODUCT` links.
- [ ] Create Upwork account + freelancer profile; post the gig draft (outreach-pack §5).
- [ ] Optional: hey.com email for a professional sender address ($99/yr — eats budget; use a free Gmail/Proton instead if budget matters).

## Day 1 (today) — Ship the free tool, open the Scout checkout
- [ ] Push repo to GitHub (public). Add topics: cost-optimization, nextjs, supabase, vercel, cli, code-analysis, ai-agents.
- [ ] Publish to npm (`npm publish`). Verify `npx costlens scan .` works in a fresh dir.
- [ ] Deploy landing page: GitHub Pages (free) or Vercel (free). The 4-tier table is already in `landing/index.html`; replace the placeholder `gumroad.com/l/YOURPRODUCT` link with the live Scout checkout and make Scout the primary CTA.
- [ ] Post demo GIF/video (record terminal scan of leaky app) — optional but helps HN.
- [ ] DM 5 founders on LinkedIn using Template A (outreach-pack §4) — link straight to Scout checkout.
- [ ] Success bar for today: landing page live, Scout buy button works, 0 sales expected.

## Day 2 — Content + first traffic
- [ ] Write a short blog post / X thread (outreach-pack §3) with the demo. CTA = Scout $29, not "book a call."
- [ ] Post to r/SideProject, r/nextjs, r/webdev (outreach-pack §2).
- [ ] Post Upwork gig. Bid on 5 relevant "code review / optimization" jobs manually.
- [ ] DM 10 more founders (personalized), each with the Scout link.
- [ ] Success bar: 1 Scout sale, ≥50 landing page visits.

## Day 3 — Big push
- [ ] Post Show HN (outreach-pack §1) at 9am PT Tue/Wed.
- [ ] Reply to every comment within 2h — comments are Scout leads.
- [ ] Post r/indiehackers + r/ExperiencedDevs + r/supabase.
- [ ] If zero Scout sales by EOD: add an explicit free-scan teaser ("first 3 findings free, full report $29") to the landing page and re-post to one new community. Do **not** cut price — $29 is already the floor.
- [ ] Success bar: 2 total Scout sales.

## Day 4 — Convert
- [ ] Follow up with everyone who engaged (HN, Reddit, LinkedIn, Upwork).
- [ ] Email every Scout buyer: offer Probe ($99) upgrade at $79 for 48h (Scout price credited).
- [ ] Ask 3 warm leads to run the free scan → pitch Scout on top of their own results.
- [ ] Tally revenue. If ≥$100 net → break even, report back and keep the same funnel.
- [ ] If ≤2 sales: keep the product, change the channel — spend Day 5 on 20 direct DMs instead of more public posting.

## Success metric
Break even = net revenue ≥ $100.

- **4 × Scout ($29)** = $116 gross, ~$104 net after Gumroad's ~10% → **clears it.** This is the plan.
- 1 × Probe ($99) = ~$89 net → needs 1 Scout alongside to clear.
- 1 × Investigate ($199) ≈ $179 net → clears it, but too high-friction to depend on in 4 days.
- 1 × Architect ($2000) ≈ $1800 net → clears it many times over; treat as bonus, never as the assumption.

## Risk notes
- Cold email from a new domain lands in spam → use LinkedIn DMs + community posts instead (already in plan).
- HN/Reddit posts can flop → that's why we have Upwork + LinkedIn + direct DMs as parallel channels.
- False positives in scanner → Scout is explicitly "automated, no human review"; iterate rules on feedback and keep v0.1 honest ("heuristic").
- $29 price invites refund/support requests → cap Scout support at one clarifying reply + re-run; upsell to Probe for anything deeper.
- Marketing copy drift → `marketing/outreach-pack.md` still references Standard/Deep at $199/$499. Update it to the 4 tiers before Day 2 or the funnel contradicts itself.
