// Bundle size: large client components, heavy imports in client bundles.
export const name = "bundle";
const BEFORE_AFTER = { before: "Large client bundle", after: "Tree-shaken bundle", savingsUsd: 60, savingsPct: "20-50% bundle reduction" };
const CODE_EXTS = [".js", ".jsx", ".ts", ".tsx"];

const HEAVY_CLIENT_IMPORTS = ["lodash", "moment", "chart.js", "d3", "three", "xlsx", "pdf-lib", "firebase", "aws-sdk"];

export async function run({ root, files, fileContents }) {
  const findings = [];

  // 1. "use client" files importing heavy libs
  const heavyClient = [];
  for (const [p, c] of fileContents.entries()) {
    if (!CODE_EXTS.some((e) => p.endsWith(e))) continue;
    if (!/^["']use client["']/.test(c.trim()) && !c.includes('"use client"') && !c.includes("'use client'")) continue;
    for (const lib of HEAVY_CLIENT_IMPORTS) {
      const re = new RegExp(`from\\s+['"]${lib}(?:/[^'"]*)?['"]|require\\(\\s*['"]${lib}`, "m");
      if (re.test(c)) heavyClient.push({ path: p, lib });
    }
  }
  if (heavyClient.length > 0) {
    const byFile = new Map();
    for (const h of heavyClient) {
      if (!byFile.has(h.path)) byFile.set(h.path, []);
      byFile.get(h.path).push(h.lib);
    }
    findings.push({
      rule: name,
      severity: "high",
      title: `Heavy libraries imported in client components (${byFile.size} files)`,
      detail: [...byFile.entries()].map(([f, libs]) => `- ${f} — ${libs.join(", ")}`).join("\n"),
      files: [...byFile.keys()].map((p) => ({ path: p, line: 1 })),
      savings: "Moving heavy libs server-side or code-splitting can cut client JS 50-90%.",
      beforeAfter: BEFORE_AFTER,
      fixPrompt: `These client components import heavy libs: ${[...byFile.entries()].map(([f, l]) => f + " (" + l.join(",") + ")").join("; ")}. Move to server components, dynamic import, or lighter alternatives.`,
    });
  }

  // 2. Very large source files (> 1000 lines) — often bundle bloat / god components
  const bigFiles = [];
  for (const [p, c] of fileContents.entries()) {
    if (!CODE_EXTS.some((e) => p.endsWith(e))) continue;
    const lines = c.split("\n").length;
    if (lines > 1000) bigFiles.push({ path: p, lines });
  }
  if (bigFiles.length > 0) {
    findings.push({
      rule: name,
      severity: "low",
      title: `Very large source files (${bigFiles.length})`,
      detail: bigFiles.map((f) => `- ${f.path} (${f.lines} lines)`).join("\n"),
      files: bigFiles.map((f) => ({ path: f.path, line: 1 })),
      savings: "Splitting reduces bundle parse time and improves tree-shaking.",
      beforeAfter: BEFORE_AFTER,
      fixPrompt: `Split these large files into smaller modules/components: ${bigFiles.map((f) => f.path).join(", ")}.`,
    });
  }

  // 3. Barrel re-exports that may defeat tree-shaking (index.js re-exporting *)
  const barrelHits = [];
  for (const [p, c] of fileContents.entries()) {
    if (!/(^|\/)index\.(js|ts|jsx|tsx)$/.test(p)) continue;
    if (/export\s+\*\s+from/.test(c)) barrelHits.push(p);
  }
  if (barrelHits.length > 0) {
    findings.push({
      rule: name,
      severity: "low",
      title: `Barrel files with export * (${barrelHits.length})`,
      detail: barrelHits.map((p) => `- ${p}`).join("\n") +
        "\n\n`export *` can defeat tree-shaking in some bundlers, pulling in unused code.",
      files: barrelHits.map((p) => ({ path: p, line: 1 })),
      savings: "Named exports improve tree-shaking, shrinking bundles.",
      beforeAfter: BEFORE_AFTER,
      fixPrompt: `Replace \`export * from\` with explicit named exports in: ${barrelHits.join(", ")}.`,
    });
  }

  return findings;
}
