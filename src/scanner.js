import { glob } from "glob";
import { readFile } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import { stat } from "node:fs/promises";

import * as depBloat from "./rules/dep-bloat.js";
import * as nPlusOne from "./rules/n-plus-one.js";
import * as caching from "./rules/caching.js";
import * as images from "./rules/images.js";
import * as bundle from "./rules/bundle.js";
import * as supabase from "./rules/supabase.js";
import * as serverless from "./rules/serverless.js";
import * as heavyDeps from "./rules/heavy-deps.js";
import * as generalBloat from "./rules/general-bloat.js";
import * as manifests from "./rules/manifests.js";
import * as docker from "./rules/docker.js";
import * as performance from "./rules/performance.js";

const RULES = [generalBloat, manifests, depBloat, heavyDeps, nPlusOne, caching, images, bundle, supabase, serverless, docker, performance];

const CODE_EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".go", ".py", ".php", ".rb", ".rs", ".java", ".cs", ".kt", ".swift", ".scala", ".c", ".cpp", ".h", ".hpp"]);
const ALL_EXTS = new Set([...CODE_EXTS, ".json", ".md", ".css", ".html", ".env", ".toml", ".yaml", ".yml", ".cfg", ".ini", ".txt", ".xml", ".gradle", ".properties", ".lock", ".mod", ".sum"]);

export async function scan(root) {
  const files = await glob("**/*", {
    cwd: root,
    nodir: true,
    ignore: ["**/node_modules/**", "**/.git/**", "**/.next/**", "**/dist/**", "**/build/**", "**/.turbo/**", "**/coverage/**"],
    dot: true,
  });

  const fileContents = new Map();
  for (const f of files) {
    const ext = extname(f);
    const isDockerfile = /(^|\/)Dockerfile(\.|$)/i.test(f) || f.toLowerCase().endsWith(".dockerfile");
    if (!ALL_EXTS.has(ext) && !isDockerfile && !f.endsWith(".env") && !f.endsWith(".env.local")) continue;
    try {
      const full = join(root, f);
      const s = await stat(full);
      if (s.size > 512 * 1024) continue;
      const content = await readFile(full, "utf8");
      fileContents.set(f, content);
    } catch {}
  }

  const findings = [];
  for (const rule of RULES) {
    try {
      const res = await rule.run({ root, files, fileContents });
      if (Array.isArray(res)) findings.push(...res);
    } catch (e) {
      findings.push({ rule: rule.name || "unknown", severity: "info", title: "Rule error", detail: e.message, files: [] });
    }
  }

  const summary = summarize(findings);
  return { root, fileCount: fileContents.size, findings, summary };
}

function summarize(findings) {
  const bySev = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) bySev[f.severity] = (bySev[f.severity] || 0) + 1;
  return bySev;
}
