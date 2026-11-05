// Missing caching on data fetching — uncached requests burn compute + DB.
export const name = "caching";
const CODE_EXTS = [".js", ".jsx", ".ts", ".tsx"];

export async function run({ root, files, fileContents }) {
  const findings = [];

  // 1. fetch() without cache/revalidate/next options
  const fetchHits = [];
  for (const [p, c] of fileContents.entries()) {
    if (!CODE_EXTS.some((e) => p.endsWith(e))) continue;
    const lines = c.split("\n");
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
      if (!/\bfetch\s*\(/.test(line)) return;
      // skip if line or next few lines specify cache/revalidate/next
      const ctx = lines.slice(i, i + 4).join(" ");
      if (/cache\s*:|revalidate\s*:|next\s*:\s*\{|no-store|force-cache/.test(ctx)) return;
      // skip obvious client-side fetch (useEffect, onClick) roughly
      if (/useEffect|onClick|onChange|onSubmit/.test(lines[Math.max(0, i - 3)] + " " + line)) return;
      fetchHits.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 120) });
    });
  }
  if (fetchHits.length > 0) {
    findings.push({
      rule: name,
      severity: "medium",
      title: `fetch() without explicit caching (${fetchHits.length})`,
      detail: fetchHits.slice(0, 25).map((h) => `- ${h.path}:${h.line} — \`${h.snippet}\``).join("\n") +
        (fetchHits.length > 25 ? `\n...and ${fetchHits.length - 25} more` : ""),
      files: fetchHits.slice(0, 25).map((h) => ({ path: h.path, line: h.line })),
      savings: "Adding revalidate/cache can cut origin requests 80-99% for read-heavy pages.",
      fixPrompt: `Add caching to these fetch calls (Next.js: fetch(url, { next: { revalidate: N } }) or { cache: 'force-cache' }). Files: ${fetchHits.slice(0, 25).map((h) => h.path + ":" + h.line).join(", ")}.`,
    });
  }

  // 2. Next.js pages without revalidate/export (dynamic rendering everywhere)
  const pageFiles = [...fileContents.keys()].filter((p) => /\/(page|layout)\.(js|jsx|ts|tsx)$/.test(p));
  // only flag if many pages and no revalidate found anywhere
  const hasRevalidate = [...fileContents.values()].some((c) => /revalidate\s*=/.test(c));
  if (pageFiles.length >= 5 && !hasRevalidate) {
    findings.push({
      rule: name,
      severity: "medium",
      title: `No ISR/revalidate found across ${pageFiles.length} pages`,
      detail: "None of the scanned files set `revalidate`. Every request may hit the origin + DB, increasing compute and cost.",
      files: pageFiles.slice(0, 10).map((p) => ({ path: p, line: 1 })),
      savings: "ISR can reduce function invocations 90%+ for content-ish pages.",
      fixPrompt: `Add \`export const revalidate = 60;\` (or appropriate interval) to static-ish page/layout components. Consider generateStaticParams for dynamic routes.`,
    });
  }

  return findings;
}
