// Flags known heavy dependencies and suggests lighter alternatives.
export const name = "heavy-deps";

const HEAVY = [
  { name: "moment", alt: "date-fns or dayjs", reason: "moment is ~300KB and not tree-shakeable" },
  { name: "lodash", alt: "native JS or lodash/* subpath imports", reason: "full lodash adds ~70KB+; tree-shaking often fails" },
  { name: "axios", alt: "native fetch", reason: "fetch is built in; axios adds bundle weight" },
  { name: "request", alt: "native fetch", reason: "deprecated and heavy" },
  { name: "jquery", alt: "vanilla JS / framework primitives", reason: "rarely needed in modern React/Next" },
  { name: "underscore", alt: "native JS", reason: "mostly superseded by native methods" },
  { name: "bluebird", alt: "native Promise", reason: "native promises are now standard" },
  { name: "uuid", alt: "crypto.randomUUID() (Node 19+/browsers)", reason: "native UUID generation available" },
  { name: "node-fetch", alt: "native fetch (Node 18+)", reason: "fetch is global since Node 18" },
  { name: "chalk", alt: "picocolors (smaller) or console styling", reason: "chalk is large for CLI color; picocolors is ~1KB" },
  { name: "moment-timezone", alt: "date-fns-tz or Intl", reason: "very large timezone data" },
  { name: "xlsx", alt: "xlsx (community) or csv parsing", reason: "heavy; consider server-side only" },
];

export async function run({ root, files, fileContents }) {
  const findings = [];
  const pkgFile = fileContents.get("package.json");
  if (!pkgFile) return findings;
  let pkg;
  try { pkg = JSON.parse(pkgFile); } catch { return findings; }
  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  const hits = HEAVY.filter((h) => Object.prototype.hasOwnProperty.call(allDeps, h.name));
  if (hits.length === 0) return findings;

  findings.push({
    rule: name,
    severity: "medium",
    title: `Heavy dependencies detected (${hits.length})`,
    detail: hits.map((h) => `- **${h.name}** → ${h.alt}. ${h.reason}`).join("\n"),
    files: [{ path: "package.json", line: 1 }],
    savings: "Swapping heavy deps commonly shrinks bundles 20-60% and reduces cold starts.",
    fixPrompt: `Replace these heavy dependencies with lighter alternatives: ${hits.map((h) => h.name + " -> " + h.alt).join("; ")}. Update imports across the codebase, then rebuild and compare bundle size.`,
  });

  return findings;
}
