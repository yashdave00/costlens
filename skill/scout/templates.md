# Scout Tier — Premium Fix Templates

Ready-to-use fix prompt templates with before/after code. Paste the "Fix prompt" block into your coding agent. Customize file paths and identifiers to your codebase.

---

## Template 1 — N+1 batch fix

**When to use:** DB/ORM calls inside loops (`for`/`while`/`forEach`/`.map`).

**Fix prompt:**
```
Fix these N+1 patterns by batching queries. For each location, convert the looped single-row fetch into one batched query using .in() / whereIn / a join. Keep the same return shape. Add a regression test that counts queries (expect 1, not N). Files: {files}.
```

**Before:**
```ts
// src/app/page.tsx
const users = await db.user.findMany();
for (const u of users) {
  const orders = await db.order.findMany({ where: { userId: u.id } });
  u.orders = orders;
}
```

**After:**
```ts
const users = await db.user.findMany();
const userIds = users.map((u) => u.id);
const orders = await db.order.findMany({ where: { userId: { in: userIds } } });
const byUser = new Map(orders.map((o) => [o.userId, [] as typeof orders]));
for (const o of orders) byUser.get(o.userId)!.push(o);
for (const u of users) u.orders = byUser.get(u.id) ?? [];
```

**Notes:** Prefer a single join (`include: { orders: true }`) when the ORM supports it. Verify query count with a logging middleware or `prisma.$on('query')`.

---

## Template 2 — Caching strategy

**When to use:** `fetch()` without cache options, pages without `revalidate`, expensive computations repeated.

**Fix prompt:**
```
Add caching to these fetch calls and pages. Next.js: fetch(url, { next: { revalidate: 60 } }) or { cache: 'force-cache' }; pages: export const revalidate = 60. For non-Next stacks, add an in-memory/Redis cache with TTL. Also add stale-while-revalidate headers. Files: {files}.
```

**Before:**
```ts
// src/app/page.tsx
const res = await fetch("https://api.example.com/stats");
const stats = await res.json();
```

**After:**
```ts
const res = await fetch("https://api.example.com/stats", {
  next: { revalidate: 60 },
});
const stats = await res.json();

// page-level ISR
export const revalidate = 60;
```

**Notes:** Pick revalidate windows per data freshness (60s for dashboards, 3600s for marketing). Use `cache: 'no-store'` only for truly dynamic per-user data. Add `stale-while-revalidate` to `Cache-Control` for CDN.

---

## Template 3 — Bundle split

**When to use:** Heavy libs imported at top level in client/serverless code; large initial bundle; slow cold starts.

**Fix prompt:**
```
Split the bundle: convert heavy imports (moment, lodash, chart.js, xlsx, pdf-lib, puppeteer, sharp) to dynamic import() loaded on demand. Remove barrel `export *` that blocks tree-shaking; import subpaths. Move server-only heavy code out of client bundles via 'server-only'. Files: {files}.
```

**Before:**
```ts
import moment from "moment";
import _ from "lodash";
import Chart from "chart.js";

export default function Page() {
  const formatted = moment().format("YYYY-MM-DD");
  const grouped = _.groupBy(items, "category");
  return <Chart data={grouped} />;
}
```

**After:**
```ts
import { format } from "date-fns";
import groupBy from "lodash/groupBy";

export default function Page() {
  const formatted = format(new Date(), "yyyy-MM-dd");
  const grouped = groupBy(items, "category");
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyChart data={grouped} />
    </Suspense>
  );
}

// HeavyChart.tsx
const Chart = dynamic(() => import("chart.js/auto"), { ssr: false });
```

**Notes:** Measure with `next build` / `webpack-bundle-analyzer`. Keep initial JS under ~170KB gzipped where possible.

---

## Template 4 — Supabase column selection

**When to use:** `.select("*")` or unbounded `.select()`.

**Fix prompt:**
```
Replace select("*") with explicit column lists and add .limit()/.single()/.maybeSingle() where a single row is expected. Also pass transform options to getPublicUrl/createSignedUrl. Files: {files}.
```

**Before:**
```ts
const { data: users } = await supabase.from("users").select("*");
const { data } = await supabase.from("orders").select("*").eq("user_id", u.id);
const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
```

**After:**
```ts
const { data: users } = await supabase
  .from("users")
  .select("id, email, created_at")
  .limit(50);
const { data } = await supabase
  .from("orders")
  .select("id, total, created_at")
  .eq("user_id", u.id)
  .limit(20);
const url = supabase.storage
  .from("avatars")
  .getPublicUrl(path, { transform: { width: 128, height: 128, resize: "cover" } })
  .data.publicUrl;
```

**Notes:** List only columns the UI/API actually uses. Add `.limit()` to every list query. Use transforms to avoid shipping full-res images.

---

## Template 5 — Image optimization

**When to use:** Raw `<img>` tags, oversized public assets, missing responsive sizes.

**Fix prompt:**
```
Replace <img> with next/image (Image). Set width/height or fill + sizes. Convert large assets to WebP/AVIF via next.config images.formats. Add priority only to LCP image. Compress sources >300KB. Files: {files}.
```

**Before:**
```tsx
<img src="/hero.png" alt="hero" />
<img src={user.avatarUrl} alt={user.name} />
```

**After:**
```tsx
import Image from "next/image";

<Image src="/hero.png" alt="hero" width={1200} height={630} priority />
<Image
  src={user.avatarUrl}
  alt={user.name}
  width={64}
  height={64}
  sizes="64px"
/>
```

```js
// next.config.js
module.exports = {
  images: { formats: ["image/avif", "image/webp"] },
};
```

**Notes:** Always provide `sizes` for `fill` images. Use `priority` for the single LCP image only. Serve from a CDN with immutable hashed filenames.