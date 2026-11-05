// Detects dependencies declared in package.json that are never imported in source.
export const name = "dep-bloat";
const CODE_EXTS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];

export async function run({ root, files, fileContents }) {
  const findings = [];
  const pkgFile = fileContents.get("package.json");
  if (!pkgFile) return findings;
  let pkg;
  try { pkg = JSON.parse(pkgFile); } catch { return findings; }
  const deps = { ...(pkg.dependencies || {}) };
  const FRAMEWORK = new Set(["next", "react", "react-dom", "vue", "nuxt", "svelte", "sveltekit", "@sveltejs/kit", "astro"]);
  const depNames = Object.keys(deps);
  if (depNames.length === 0) return findings;

  // Collect all source code text
  const codeText = [...fileContents.entries()]
    .filter(([p]) => CODE_EXTS.some((e) => p.endsWith(e)))
    .map(([, c]) => c)
    .join("\n");

  const unused = [];
  for (const dep of depNames) {
    if (FRAMEWORK.has(dep)) continue;
    // normalize scoped names: @scope/pkg -> pkg for import matching heuristic
    const importName = dep.startsWith("@") ? dep : dep;
    // check for require/import of dep or subpath
    const escaped = importName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:from\\s+['"]${escaped}(?:/[^'"]*)?['"]|require\\(\\s*['"]${escaped}(?:/[^'"]*)?['"]\\s*\\))`, "m");
    if (!re.test(codeText)) {
      // allow next/font, etc. via subpath imports handled above; also skip type-only-ish
      unused.push(dep);
    }
  }

  if (unused.length > 0) {
    findings.push({
      rule: name,
      severity: unused.length > 5 ? "high" : "medium",
      title: `Potentially unused dependencies (${unused.length})`,
      detail: `These packages are declared in package.json but no import/require was found in scanned source. Unused deps inflate install size, bundle size, and (on Vercel) function bundle size → higher cold-start and build minutes.\n\n${unused.map((d) => `- ${d}`).join("\n")}`,
      files: [{ path: "package.json", line: 1 }],
      savings: "Removes dead weight from node_modules and serverless bundles; often 10-40% smaller functions.",
      fixPrompt: `Audit these dependencies: ${unused.join(", ")}. For each, confirm it's truly unused (check config files, scripts, dynamic imports). Remove unused ones from package.json and reinstall. Then run the build to confirm nothing breaks.`,
    });
  }

  // Flag excessive total dependency count
  if (depNames.length > 60) {
    findings.push({
      rule: name,
      severity: "medium",
      title: `High dependency count (${depNames.length})`,
      detail: `Large dependency graphs increase install time, supply-chain risk, and bundle size. Vibe-coded apps often accumulate deps from copy-pasted snippets.`,
      files: [{ path: "package.json", line: 1 }],
      savings: "Pruning 20-30% of deps typically cuts build minutes and cold starts.",
      fixPrompt: `Review package.json dependencies. Remove anything not directly imported. Prefer native APIs over micro-libraries. Consolidate duplicate utilities.`,
    });
  }

  return findings;
}
