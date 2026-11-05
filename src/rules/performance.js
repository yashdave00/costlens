// Cross-language performance anti-patterns: SELECT *, missing LIMIT, nested loops, blocking calls.
export const name = "performance";

const CODE_EXTS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".go", ".py", ".php", ".rb", ".rs", ".java", ".cs", ".kt", ".sql"];
const BEFORE_AFTER = { before: "Unbounded / blocking code", after: "Bounded / async code", savingsUsd: 90, savingsPct: "30-80% less compute per request" };

function isComment(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("#") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("--");
}

export async function run({ root, files, fileContents }) {
  const findings = [];

  // 1. SELECT * in raw SQL
  const selectStar = [];
  // 2. ORDER BY without LIMIT
  const orderNoLimit = [];
  // 3. Blocking sleep in request paths
  const blocking = [];
  // 4. Nested loops over collections (O(n^2) risk)
  const nestedLoops = [];

  for (const [p, c] of fileContents.entries()) {
    if (!CODE_EXTS.some((e) => p.endsWith(e))) continue;
    if (/(^|\/)(tests?|spec|fixtures?|__tests__|node_modules)\//.test(p)) continue;
    const lines = c.split("\n");

    lines.forEach((line, i) => {
      if (isComment(line)) return;

      // SELECT * in SQL strings
      if (/\bSELECT\s+\*\s+FROM\b/i.test(line) && !/\bCOUNT\s*\(/i.test(line)) {
        selectStar.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 140) });
      }

      // ORDER BY without LIMIT on the same statement-ish window
      if (/\bORDER\s+BY\b/i.test(line)) {
        const window = lines.slice(i, Math.min(i + 3, lines.length)).join(" ");
        if (!/\bLIMIT\b|\bTOP\s+\d+|\bFETCH\s+FIRST/i.test(window)) {
          orderNoLimit.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 140) });
        }
      }

      // Blocking sleeps in server code
      if (/\b(sleep|time\.sleep|Thread\.sleep|time\.Sleep|usleep)\s*\(/.test(line)) {
        blocking.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 140) });
      }

      // Nested loops: require the inner loop to be indented deeper than the outer.
      if (/\b(for|while|forEach|\.map\(|\.flatMap\(|for\s+\w+\s+in|for\s+\w+\s+of|foreach\s*\()\b/.test(line)) {
        const outerIndent = line.match(/^\s*/)[0].length;
        const window = lines.slice(i + 1, Math.min(i + 15, lines.length));
        const hasDeeperLoop = window.some((w) => {
          if (isComment(w)) return false;
          const innerIndent = w.match(/^\s*/)[0].length;
          return (
            innerIndent > outerIndent &&
            /\b(for|while|forEach|\.map\(|\.flatMap\(|for\s+\w+\s+in|for\s+\w+\s+of|foreach\s*\()\b/.test(w)
          );
        });
        if (hasDeeperLoop) nestedLoops.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 120) });
      }
    });
  }

  const dedup = (arr) => {
    const seen = new Set();
    return arr.filter((h) => {
      const k = h.path + ":" + h.line;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const ss = dedup(selectStar);
  if (ss.length > 0) {
    findings.push({
      rule: name,
      severity: "high",
      title: `SELECT * queries (${ss.length})`,
      detail: ss.slice(0, 25).map((h) => `- ${h.path}:${h.line} — \`${h.snippet}\``).join("\n") +
        (ss.length > 25 ? `\n...and ${ss.length - 25} more` : "") +
        "\n\nPulling every column increases DB egress, serialization cost, and memory. On managed DBs (Supabase/RDS) this is billed.",
      files: ss.slice(0, 25).map((h) => ({ path: h.path, line: h.line })),
      savings: "Selecting only needed columns cuts egress 40-90% on wide tables.",
      beforeAfter: { before: "SELECT * (all columns)", after: "Explicit column list", savingsUsd: 120, savingsPct: "40-90% less egress" },
      fixPrompt: `Replace SELECT * with explicit column lists in: ${ss.slice(0, 25).map((h) => h.path + ":" + h.line).join(", ")}.`,
    });
  }

  const onl = dedup(orderNoLimit);
  if (onl.length > 0) {
    findings.push({
      rule: name,
      severity: "medium",
      title: `ORDER BY without LIMIT (${onl.length})`,
      detail: onl.slice(0, 25).map((h) => `- ${h.path}:${h.line} — \`${h.snippet}\``).join("\n") +
        (onl.length > 25 ? `\n...and ${onl.length - 25} more` : "") +
        "\n\nSorting an unbounded result set forces a full scan and sort. Add LIMIT (or pagination).",
      files: onl.slice(0, 25).map((h) => ({ path: h.path, line: h.line })),
      savings: "Bounding sort results cuts DB CPU and memory.",
      beforeAfter: { before: "Unbounded ORDER BY", after: "ORDER BY ... LIMIT N", savingsUsd: 60, savingsPct: "20-70% less DB sort work" },
      fixPrompt: `Add LIMIT (or keyset pagination) to these ORDER BY queries: ${onl.slice(0, 25).map((h) => h.path + ":" + h.line).join(", ")}.`,
    });
  }

  const bl = dedup(blocking);
  if (bl.length > 0) {
    findings.push({
      rule: name,
      severity: "medium",
      title: `Blocking sleep calls (${bl.length})`,
      detail: bl.slice(0, 25).map((h) => `- ${h.path}:${h.line} — \`${h.snippet}\``).join("\n") +
        "\n\nSleeps hold the request/worker open, burning compute time. Use async delays, retries with backoff, or background jobs.",
      files: bl.slice(0, 25).map((h) => ({ path: h.path, line: h.line })),
      savings: "Removing blocking sleeps frees worker time.",
      beforeAfter: { before: "Blocking sleep in request path", after: "Async delay / background job", savingsUsd: 40, savingsPct: "10-50% less worker time" },
      fixPrompt: `Replace blocking sleep calls with async delays or move work to a background job in: ${bl.slice(0, 25).map((h) => h.path + ":" + h.line).join(", ")}.`,
    });
  }

  const nl = dedup(nestedLoops);
  if (nl.length > 0) {
    findings.push({
      rule: name,
      severity: "low",
      title: `Nested loops (O(n²) risk) (${nl.length})`,
      detail: nl.slice(0, 25).map((h) => `- ${h.path}:${h.line} — \`${h.snippet}\``).join("\n") +
        (nl.length > 25 ? `\n...and ${nl.length - 25} more` : "") +
        "\n\nNested iteration over collections can explode with data size. Use maps/sets or batch operations.",
      files: nl.slice(0, 25).map((h) => ({ path: h.path, line: h.line })),
      savings: "Flattening to O(n) cuts CPU dramatically at scale.",
      beforeAfter: { before: "O(n²) nested loop", after: "O(n) map/set lookup", savingsUsd: 50, savingsPct: "varies with n" },
      fixPrompt: `Review these nested loops for O(n²) behavior and replace with a Map/Set or batched query: ${nl.slice(0, 25).map((h) => h.path + ":" + h.line).join(", ")}.`,
    });
  }

  return findings;
}
