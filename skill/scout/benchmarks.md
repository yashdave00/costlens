# Scout Tier — Savings Benchmarks by Leak Type

Typical savings ranges observed across real-world cost audits. Use these to size estimates; always present as ranges and label as estimates, not guarantees.

## Benchmark table

| Leak type | Typical savings | Basis |
|---|---|---|
| N+1 query fixes | 10-1000× query reduction | Batching/joining collapses N calls to 1 |
| Missing caching / no ISR | 80-99% origin request reduction; 90%+ invocation reduction | Revalidate windows absorb repeat traffic |
| Image optimization | 30-70% bandwidth reduction | next/image + modern formats + responsive sizes |
| Bundle trimming (heavy deps) | 20-60% smaller bundles; 40-80% faster cold starts | Remove/swap moment, lodash, axios, etc. |
| Supabase column selection | 50-90% egress reduction | select("*") → explicit columns |
| Unbounded queries (missing .limit) | 2-10× payload reduction | Cap result sets |
| Dependency removal (unused) | 10-40% smaller functions | Drop dead weight from node_modules |
| Sync blocking calls → async | 20-50% compute time reduction | Free the event loop |
| Raw `<img>` → next/image | 30-70% image bytes | Optimization + responsive srcset |
| Barrel `export *` removal | 5-20% bundle reduction | Better tree-shaking |
| Large committed files moved to storage | 100% repo/clone size reduction for those assets | Offload to object storage / CDN |
| Realtime overuse (>5 channels) | 30-80% connection cost reduction | Consolidate subscriptions |
| Heavy serverless routes (puppeteer/sharp) | 40-80% cold-start reduction | Dynamic import / background jobs |
| Connection pooling | 90%+ fewer connection errors; lower DB compute | Reuse clients / pgbouncer |
| CDN caching headers | 60-95% origin load reduction | Cache-Control + SWR + immutable |
| DB index recommendations | 10-100× query speedup; lower DB CPU | Index filter/sort columns |
| API rate limiting | Prevents unbounded spend (10-100× bill spikes) | Caps abuse-driven usage |
| Cold start optimization | 30-70% cold-start reduction | Lazy init + code splitting |

## How to apply

- Match each finding to the row above and quote the range in "Estimated impact."
- Combine ranges multiplicatively only when independent (e.g., bundle + cold start); otherwise take the dominant range.
- Label every number as an estimate; recommend re-measuring after fixes (see Verification plan).
- For cost in dollars, multiply saved invocations/egress by the provider's unit price; never invent a dollar figure without current spend input.