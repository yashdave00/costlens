#!/usr/bin/env node
// Create the 4 CostLens products on Gumroad via API.
// Usage: GUMROAD_TOKEN=xxx node scripts/gumroad-create.mjs
// Requires a Gumroad access token with the `edit_products` scope.

const TOKEN = process.env.GUMROAD_TOKEN;
if (!TOKEN) {
  console.error("Missing GUMROAD_TOKEN. Generate one at https://gumroad.com/settings/advanced (Applications → create app → copy access token).");
  process.exit(1);
}

const API = "https://api.gumroad.com/v2";

const products = [
  {
    name: "CostLens Scout — Cost Audit Skill for Claude Code & Cursor",
    price: 2900,
    description: `Find the cloud money your codebase is burning.

Scout is the paid CostLens agent skill. Install it in Claude Code, Cursor, or Codex and run a full cost audit on any repo, any language.

What's inside:
- SKILL.md: audit methodology for JS/TS, Python, Go, Ruby, PHP, Rust, Java
- templates.md: 5 fix templates with before/after code
- benchmarks.md: savings benchmarks by leak type
- README.md: install and use instructions

What it finds: N+1 queries, uncached fetches, heavy deps, Supabase select("*"), image bloat, Docker image bloat.

Every finding includes file:line, estimated savings, and a fix prompt you can paste into your agent.

Works with the free CLI too: npx costlens scan .`,
    tags: ["developer tools", "AI", "claude", "cursor", "cost optimization", "devops"],
  },
  {
    name: "Probe — Cloud Cost Audit (48h)",
    price: 9900,
    description: `Your cloud bill is too high. I'll find out why in 48 hours.

Probe is a full cloud cost audit. You send read-only IAM access (preferred) or a billing CSV export. I send back:
- Top-5 waste categories with $ estimates
- Right-sizing recommendations
- Reserved Instance / Savings Plan suggestions
- Prioritized fix list with effort
- Before/after cost projections

Providers: AWS, GCP, Vercel, Supabase, Hetzner.

No credentials? Use the CSV export option. Takes 2 minutes.

48-hour turnaround after intake.`,
    tags: ["cloud", "aws", "gcp", "devops", "cost optimization", "finops"],
  },
  {
    name: "Investigate — Code + Cloud Audit + PRs",
    price: 19900,
    description: `Connect the code to the bill. Then fix it.

Investigate includes everything in Probe, plus:
- Code-to-cloud correlation: which code paths drive which costs
- DB query review: N+1, missing indexes, unbounded queries, egress-heavy queries
- PRs for the top 3 fixes (you review and merge)

Deliverables: full report + DB review + 3 PRs.
Turnaround: 3-5 days.
You keep all code. I never push to main.`,
    tags: ["code review", "database", "performance", "cloud", "supabase", "nextjs"],
  },
  {
    name: "Architect — Full Code + Cloud + Architecture Review",
    price: 200000,
    description: `A full review of cost, latency, and throughput. With a guarantee.

Architect includes everything in Investigate, plus:
- Full architecture review (cost, latency, throughput tradeoffs)
- PRs for the top fixes
- 1-hour call to walk through findings
- 30-day follow-up to verify savings
- Savings guarantee: if I don't identify at least $200/mo in savings, full refund

Deliverables: full report, architecture recommendations, PRs, call, follow-up.
Turnaround: 5-7 days.`,
    tags: ["architecture", "cloud", "finops", "performance", "consulting"],
  },
];

async function createProduct(p) {
  const body = new URLSearchParams({
    access_token: TOKEN,
    name: p.name,
    price: String(p.price),
    description: p.description,
    tags: p.tags.join(","),
  });
  const res = await fetch(`${API}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`${p.name}: ${data.message || JSON.stringify(data)}`);
  }
  return data.product;
}

const created = [];
for (const p of products) {
  try {
    const prod = await createProduct(p);
    created.push({ name: p.name, id: prod.id, url: prod.short_url || prod.url });
    console.log(`created: ${p.name} -> ${prod.short_url || prod.url}`);
  } catch (e) {
    console.error(`failed: ${e.message}`);
  }
}

console.log("\nCreated products:");
for (const c of created) console.log(`- ${c.name}: ${c.url}`);
console.log("\nNext: upload files for each product in the Gumroad dashboard, then paste the product URLs into docs/index.html.");
