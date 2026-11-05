// Cross-language dependency manifest analysis: counts deps and flags heavy ones.
export const name = "manifests";
const BEFORE_AFTER = { before: "High dep count", after: "Pruned deps", savingsUsd: 30, savingsPct: "20-30% fewer deps" };

const MANIFESTS = [
  { file: "package.json", type: "npm" },
  { file: "requirements.txt", type: "pip" },
  { file: "pyproject.toml", type: "pip" },
  { file: "Pipfile", type: "pip" },
  { file: "go.mod", type: "go" },
  { file: "Gemfile", type: "ruby" },
  { file: "composer.json", type: "php" },
  { file: "Cargo.toml", type: "rust" },
  { file: "pom.xml", type: "java" },
  { file: "build.gradle", type: "java" },
  { file: "build.gradle.kts", type: "java" },
];

const HEAVY_BY_ECOSYSTEM = {
  pip: [
    { name: "pandas", alt: "polars (faster, lower memory) or duckdb", reason: "pandas is memory-heavy; polars/duckdb often 2-5x faster" },
    { name: "tensorflow", alt: "torch or onnxruntime (if only inference)", reason: "TF is huge; use lighter runtime for inference" },
    { name: "scipy", alt: "numpy-only where possible", reason: "large; import only needed submodules" },
    { name: "matplotlib", alt: "plotly/altair or headless rendering", reason: "heavy GUI deps on servers" },
    { name: "requests", alt: "httpx or urllib (stdlib)", reason: "httpx is faster and async-capable" },
    { name: "boto3", alt: "aiobotocore / targeted SDK", reason: "large; import specific clients" },
  ],
  npm: [], // handled by heavy-deps rule
  go: [],
  ruby: [
    { name: "rails", alt: "sinatra/roda for small services", reason: "Rails is heavy; use lighter framework for microservices" },
  ],
  php: [],
  rust: [],
  java: [],
};

function parseDeps(type, content) {
  try {
    if (type === "npm") {
      const j = JSON.parse(content);
      return Object.keys({ ...(j.dependencies || {}), ...(j.devDependencies || {}) });
    }
    if (type === "pip") {
      if (content.includes("[project]")) {
        // pyproject.toml: extract dependencies list roughly
        const m = content.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
        if (m) {
          return [...m[1].matchAll(/["']([A-Za-z0-9_.-]+)/g)].map((x) => x[1].split("[")[0]);
        }
        return [];
      }
      // requirements.txt
      return content.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
        .map((l) => l.split(/[=<>!~]/)[0].trim()).filter(Boolean);
    }
    if (type === "go") {
      const deps = [];
      const block = content.match(/require\s*\(([\s\S]*?)\)/);
      const src = block ? block[1] : content;
      for (const m of src.matchAll(/^\s*([^\s]+)\s+v[\d.]/gm)) deps.push(m[1]);
      return deps;
    }
    if (type === "ruby") {
      return [...content.matchAll(/gem\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    }
    if (type === "php") {
      const j = JSON.parse(content);
      return Object.keys({ ...(j.require || {}), ...(j["require-dev"] || {}) });
    }
    if (type === "rust") {
      const deps = [];
      const sec = content.match(/\[dependencies\]([\s\S]*?)(?:\[|$)/);
      const src = sec ? sec[1] : "";
      for (const m of src.matchAll(/^([A-Za-z0-9_-]+)\s*=/gm)) deps.push(m[1]);
      return deps;
    }
    if (type === "java") {
      // rough: count dependency declarations
      const deps = [];
      for (const m of content.matchAll(/<artifactId>([^<]+)<\/artifactId>/g)) deps.push(m[1]);
      for (const m of content.matchAll(/implementation\s+['"]([^'"]+)['"]/g)) deps.push(m[1]);
      return deps;
    }
  } catch {}
  return [];
}

export async function run({ root, files, fileContents }) {
  const findings = [];

  for (const m of MANIFESTS) {
    const content = fileContents.get(m.file);
    if (!content) continue;

    const deps = parseDeps(m.type, content);
    if (deps.length === 0) continue;

    // Heavy dep flags
    const heavyList = HEAVY_BY_ECOSYSTEM[m.type] || [];
    const hits = heavyList.filter((h) => deps.some((d) => d.toLowerCase() === h.name.toLowerCase() || d.toLowerCase().includes(h.name.toLowerCase())));
    if (hits.length > 0) {
      findings.push({
        rule: name,
        severity: "medium",
        title: `Heavy ${m.type} dependencies in ${m.file} (${hits.length})`,
        detail: hits.map((h) => `- **${h.name}** → ${h.alt}. ${h.reason}`).join("\n"),
        files: [{ path: m.file, line: 1 }],
        savings: "Lighter alternatives reduce install size, memory, and cold starts.",
        beforeAfter: BEFORE_AFTER,
        fixPrompt: `Replace heavy dependencies in ${m.file}: ${hits.map((h) => h.name + " -> " + h.alt).join("; ")}.`,
      });
    }

    // High dep count
    const threshold = m.type === "npm" ? 60 : 40;
    if (deps.length > threshold) {
      findings.push({
        rule: name,
        severity: "medium",
        title: `High dependency count in ${m.file} (${deps.length})`,
        detail: `${m.file} declares ${deps.length} dependencies. Large graphs increase install/build time, supply-chain risk, and (for serverless) bundle size.`,
        files: [{ path: m.file, line: 1 }],
        savings: "Pruning 20-30% of deps typically cuts build minutes and cold starts.",
        beforeAfter: BEFORE_AFTER,
        fixPrompt: `Audit ${m.file}: remove unused deps, prefer stdlib/native APIs, consolidate duplicates.`,
      });
    }
  }

  return findings;
}
