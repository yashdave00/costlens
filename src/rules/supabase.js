// Supabase-specific cost leaks: select(*), missing limits, realtime overuse.
export const name = "supabase";
const BEFORE_AFTER = { before: "select(*) + unbounded queries", after: "Targeted columns + limits", savingsUsd: 80, savingsPct: "50-90% egress reduction" };
const CODE_EXTS = [".js", ".jsx", ".ts", ".tsx"];

function hasSupabaseImport(content) {
  return /(?:require\s*\(\s*['"]@supabase\/supabase-js['"]|from\s+['"]@supabase\/supabase-js['"]|import\s*\(\s*['"]@supabase\/supabase-js['"])/i.test(content);
}

export async function run({ root, files, fileContents }) {
  const findings = [];

  const selectStar = [];
  const noLimit = [];
  const realtime = [];
  const storagePublic = [];

  for (const [p, c] of fileContents.entries()) {
    if (!CODE_EXTS.some((e) => p.endsWith(e))) continue;
    if (!hasSupabaseImport(c)) continue;
    const lines = c.split("\n");
    lines.forEach((line, i) => {
      if (/\.select\(\s*['"]\*['"]\s*\)/.test(line)) selectStar.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 120) });
      if (/\.select\(/.test(line) && !/\.limit\(/.test(line) && !/\.single\(/.test(line) && !/\.maybeSingle\(/.test(line)) {
        // only flag if it's a list-style select (not obviously single)
        if (!/single|maybeSingle/.test(line)) noLimit.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 120) });
      }
      if (/\.channel\(|supabase.*realtime|realtime.*subscribe/i.test(line)) realtime.push({ path: p, line: i + 1 });
      if (/getPublicUrl|createSignedUrl/.test(line) && !/transform|width|height/.test(line)) storagePublic.push({ path: p, line: i + 1 });
    });
  }

  if (selectStar.length > 0) {
    const capped = selectStar.slice(0, 25);
    findings.push({
      rule: name,
      severity: "medium",
      title: `Supabase select("*") (${capped.length})`,
      detail: capped.map((h) => `- ${h.path}:${h.line} — \`${h.snippet}\``).join("\n"),
      files: capped.map((h) => ({ path: h.path, line: h.line })),
      savings: "Selecting only needed columns cuts egress and serialization cost.",
      beforeAfter: BEFORE_AFTER,
      fixPrompt: `Replace select("*") with explicit column lists in: ${capped.map((h) => h.path + ":" + h.line).join(", ")}.`,
    });
  }

  // De-dup noLimit by file+line already unique; cap noise
  const noLimitUniq = noLimit.filter((h, idx, arr) => arr.findIndex((x) => x.path === h.path && x.line === h.line) === idx).slice(0, 25);
  if (noLimitUniq.length > 5) {
    findings.push({
      rule: name,
      severity: "low",
      title: `Supabase queries without .limit() (${noLimitUniq.length})`,
      detail: noLimitUniq.map((h) => `- ${h.path}:${h.line} — \`${h.snippet}\``).join("\n"),
      files: noLimitUniq.map((h) => ({ path: h.path, line: h.line })),
      savings: "Unbounded queries can return huge payloads → egress + client memory.",
      beforeAfter: BEFORE_AFTER,
      fixPrompt: `Add .limit(N) to list queries in: ${noLimitUniq.map((h) => h.path + ":" + h.line).join(", ")}.`,
    });
  }

  const realtimeCapped = realtime.slice(0, 25);
  if (realtime.length > 5) {
    findings.push({
      rule: name,
      severity: "low",
      title: `Supabase realtime channel usage (${realtime.length})`,
      detail: "Realtime subscriptions keep connections open and incur per-message cost. Ensure they're necessary and cleaned up.",
      files: realtimeCapped.map((h) => ({ path: h.path, line: h.line })),
      savings: "Removing unnecessary realtime cuts connection + message costs.",
      beforeAfter: BEFORE_AFTER,
      fixPrompt: `Audit realtime subscriptions; remove unused channels and unsubscribe on unmount. Files: ${realtimeCapped.map((h) => h.path + ":" + h.line).join(", ")}.`,
    });
  }

  const storageCapped = storagePublic.slice(0, 25);
  if (storagePublic.length > 0) {
    findings.push({
      rule: name,
      severity: "low",
      title: `Supabase storage public URLs without transforms (${storagePublic.length})`,
      detail: "Serving full-size images via getPublicUrl increases bandwidth. Use transform options or an image CDN.",
      files: storageCapped.map((h) => ({ path: h.path, line: h.line })),
      savings: "Image transforms cut storage egress 50-80%.",
      beforeAfter: BEFORE_AFTER,
      fixPrompt: `Add transform (width/height/quality) to storage getPublicUrl/createSignedUrl calls. Files: ${storageCapped.map((h) => h.path + ":" + h.line).join(", ")}.`,
    });
  }

  return findings;
}