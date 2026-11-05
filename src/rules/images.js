// Image optimization: raw <img> tags and oversized public assets.
export const name = "images";
const BEFORE_AFTER = { before: "Unoptimized images", after: "Optimized WebP/AVIF", savingsUsd: 40, savingsPct: "30-70% bandwidth reduction" };

export async function run({ root, files, fileContents }) {
  const findings = [];

  // Only treat <img> as a cost issue in Next.js projects (next/image is the fix).
  const isNextProject =
    [...fileContents.entries()].some(([p, c]) => /(^|\/)package\.json$/.test(p) && /next/i.test(c)) ||
    [...fileContents.keys()].some((p) => /next\.config/i.test(p));

  // 1. <img> usage instead of next/image (only .jsx/.tsx in Next.js projects)
  if (isNextProject) {
    const imgHits = [];
    for (const [p, c] of fileContents.entries()) {
      if (!p.endsWith(".jsx") && !p.endsWith(".tsx")) continue;
      const lines = c.split("\n");
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
        if (/<img\b/.test(line) && !/next\/image/.test(line)) {
          imgHits.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 120) });
        }
      });
    }
    if (imgHits.length > 0) {
      findings.push({
        rule: name,
        severity: "medium",
        title: `Raw <img> tags instead of next/image (${imgHits.length})`,
        detail: imgHits.slice(0, 25).map((h) => `- ${h.path}:${h.line} — \`${h.snippet}\``).join("\n") +
          (imgHits.length > 25 ? `\n...and ${imgHits.length - 25} more` : ""),
        files: imgHits.slice(0, 25).map((h) => ({ path: h.path, line: h.line })),
        savings: "next/image serves optimized formats/sizes, cutting bandwidth 30-70% and improving Core Web Vitals.",
        beforeAfter: BEFORE_AFTER,
        fixPrompt: `Replace <img> with next/image (Image component) in: ${imgHits.slice(0, 25).map((h) => h.path + ":" + h.line).join(", ")}. Set width/height or fill + sizes.`,
      });
    }
  }

  // 2. Large images in public/
  const bigAssets = [];
  for (const [p, c] of fileContents.entries()) {
    if (!/(^|\/)public\//.test(p)) continue;
    if (!/\.(png|jpg|jpeg|gif|webp|avif|svg)$/i.test(p)) continue;
    if (c.length > 300 * 1024) bigAssets.push({ path: p, size: c.length });
  }
  if (bigAssets.length > 0) {
    findings.push({
      rule: name,
      severity: "medium",
      title: `Oversized images in public/ (${bigAssets.length})`,
      detail: bigAssets.map((f) => `- ${f.path} (${(f.size / 1024).toFixed(0)}KB)`).join("\n"),
      files: bigAssets.map((f) => ({ path: f.path, line: 1 })),
      savings: "Compressing images often cuts 50-80% of asset bandwidth.",
      beforeAfter: BEFORE_AFTER,
      fixPrompt: `Compress/convert these images to WebP/AVIF and appropriate dimensions: ${bigAssets.map((f) => f.path).join(", ")}. Use next/image with sizes.`,
    });
  }

  return findings;
}