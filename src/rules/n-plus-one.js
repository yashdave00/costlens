// Detects DB/ORM calls inside loops — classic N+1 cost multiplier.
export const name = "n-plus-one";
const CODE_EXTS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".go", ".rb", ".php"];

const DB_CALL_RE = /(supabase|prisma|db|database|knex|sequelize|mongoose|mongo|redis|sql|query|execute|fetch)\s*\.\s*(from|select|find|findOne|findMany|query|execute|get|getAll|list|search|rpc|insert|update|delete)\b/gi;
const LOOP_RE = /\b(for|while|forEach|map|flatMap|reduce|filter)\s*[\(\{]/g;

export async function run({ root, files, fileContents }) {
  const findings = [];
  const hits = [];

  for (const [p, c] of fileContents.entries()) {
    if (!CODE_EXTS.some((e) => p.endsWith(e))) continue;
    const lines = c.split("\n");
    // Heuristic: for each line with a loop keyword, check the next ~8 lines for a DB call
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (t.startsWith("//") || t.startsWith("*")) continue;
      if (!/\b(for|while|forEach|\.map\(|\.flatMap\(|\.reduce\(|\.filter\()\b/.test(lines[i])) continue;
      const window = lines.slice(i, Math.min(i + 10, lines.length)).join("\n");
      const dbMatches = window.match(DB_CALL_RE);
      if (dbMatches && dbMatches.length > 0) {
        // avoid flagging the same loop twice
        hits.push({ path: p, line: i + 1, snippet: lines[i].trim().slice(0, 120) });
      }
    }
  }

  // Dedup by file+line
  const seen = new Set();
  const uniq = hits.filter((h) => {
    const k = h.path + ":" + h.line;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (uniq.length > 0) {
    findings.push({
      rule: name,
      severity: "high",
      title: `Possible N+1 query patterns (${uniq.length})`,
      detail: uniq.slice(0, 25).map((h) => `- ${h.path}:${h.line} — \`${h.snippet}\``).join("\n") +
        (uniq.length > 25 ? `\n...and ${uniq.length - 25} more` : "") +
        "\n\nDB calls inside loops multiply query count with data size → latency and cost (especially Supabase/managed DB egress and compute).",
      files: uniq.slice(0, 25).map((h) => ({ path: h.path, line: h.line })),
      savings: "Batching/Joining often cuts DB calls 10-1000x and egress cost proportionally.",
      fixPrompt: `Fix these N+1 patterns by batching queries (use .in() / whereIn, or a single join). Files: ${uniq.slice(0, 25).map((h) => h.path + ":" + h.line).join(", ")}. Convert looped single-row fetches into one batched query.`,
    });
  }
  return findings;
}
