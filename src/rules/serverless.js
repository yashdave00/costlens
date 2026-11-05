// Serverless function cost: heavy imports in API routes, sync work, missing edge.
export const name = "serverless";
const BEFORE_AFTER = { before: "Heavy serverless bundle", after: "Trimmed bundle", savingsUsd: 120, savingsPct: "40-80% cold start reduction" };
const CODE_EXTS = [".js", ".jsx", ".ts", ".tsx"];

export async function run({ root, files, fileContents }) {
  const findings = [];

  const apiFiles = [...fileContents.keys()].filter((p) => /\/(api|routes|functions)\//.test(p) || /route\.(js|ts)$/.test(p));
  if (apiFiles.length === 0) return findings;

  // Heavy imports inside API routes
  const heavyInApi = [];
  const HEAVY = ["lodash", "moment", "puppeteer", "playwright", "sharp", "canvas", "xlsx", "pdf-lib", "firebase-admin", "aws-sdk", "stripe"];
  for (const p of apiFiles) {
    const c = fileContents.get(p) || "";
    for (const lib of HEAVY) {
      const re = new RegExp(`from\\s+['"]${lib}(?:/[^'"]*)?['"]|require\\(\\s*['"]${lib}`, "m");
      if (re.test(c)) heavyInApi.push({ path: p, lib });
    }
  }
  if (heavyInApi.length > 0) {
    const byFile = new Map();
    for (const h of heavyInApi) {
      if (!byFile.has(h.path)) byFile.set(h.path, []);
      byFile.get(h.path).push(h.lib);
    }
    findings.push({
      rule: name,
      severity: "high",
      title: `Heavy dependencies in serverless routes (${byFile.size} files)`,
      detail: [...byFile.entries()].map(([f, libs]) => `- ${f} — ${libs.join(", ")}`).join("\n") +
        "\n\nHeavy imports inflate function bundle size → cold starts, memory, and (Vercel) function size limits.",
      files: [...byFile.keys()].map((p) => ({ path: p, line: 1 })),
      savings: "Trimming route bundles often cuts cold start 40-80% and avoids size-limit failures.",
      beforeAfter: BEFORE_AFTER,
      fixPrompt: `Reduce bundle size in these API routes: ${[...byFile.entries()].map(([f, l]) => f + " (" + l.join(",") + ")").join("; ")}. Use dynamic imports, move heavy work to background jobs, or use lighter libs.`,
    });
  }

  // Sync filesystem / blocking calls in routes
  const blocking = [];
  for (const p of apiFiles) {
    const c = fileContents.get(p) || "";
    if (/readFileSync|writeFileSync|execSync|spawnSync/.test(c)) blocking.push(p);
  }
  if (blocking.length > 0) {
    findings.push({
      rule: name,
      severity: "medium",
      title: `Synchronous blocking calls in serverless routes (${blocking.length})`,
      detail: blocking.map((p) => `- ${p}`).join("\n"),
      files: blocking.map((p) => ({ path: p, line: 1 })),
      savings: "Blocking calls tie up function execution time → higher compute cost.",
      beforeAfter: BEFORE_AFTER,
      fixPrompt: `Convert sync fs/child_process calls to async (readFile, writeFile, exec) in: ${blocking.join(", ")}.`,
    });
  }

  return findings;
}
