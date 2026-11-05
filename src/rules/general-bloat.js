// Language-agnostic bloat checks: large files, committed binaries, secrets, duplicate assets.
export const name = "general-bloat";

const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".mp4", ".mov", ".mp3", ".wav",
  ".zip", ".tar", ".gz", ".pdf", ".woff", ".woff2", ".ttf", ".eot", ".psd", ".ai",
]);
const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,                 // AWS access key
  /sk-[A-Za-z0-9]{20,}/,               // OpenAI/Stripe-style
  /ghp_[A-Za-z0-9]{30,}/,              // GitHub PAT
  /xox[baprs]-[A-Za-z0-9-]{10,}/,      // Slack
];

export async function run({ root, files, fileContents }) {
  const findings = [];

  // 1. Large tracked files (> 500KB)
  const large = [];
  for (const [p, c] of fileContents.entries()) {
    if (c.length > 500 * 1024) large.push({ path: p, size: c.length });
  }
  // also check files not read (binary) via files list size not available; skip
  if (large.length > 0) {
    findings.push({
      rule: name,
      severity: "high",
      title: `Large files in repo (${large.length})`,
      detail: large.map((f) => `- ${f.path} (${(f.size / 1024).toFixed(0)}KB)`).join("\n") +
        "\n\nLarge blobs bloat clones, CI, and (if under public/) get served to browsers. Move to object storage / CDN or git-lfs.",
      files: large.map((f) => ({ path: f.path, line: 1 })),
      savings: "Removing 10MB of blobs typically cuts clone/CI time 30-60%.",
      fixPrompt: `Move these large files out of the repo (to S3/R2/CDN or git-lfs): ${large.map((f) => f.path).join(", ")}. Update references. Add them to .gitignore.`,
    });
  }

  // 2. Committed binaries in source dirs (not public/assets where expected)
  const binInSrc = files.filter((f) => {
    const ext = f.slice(f.lastIndexOf(".")).toLowerCase();
    if (!BINARY_EXT.has(ext)) return false;
    // allow public/, assets/, static/, images/ dirs
    if (/(^|\/)(public|assets|static|images|img|media)\//.test(f)) return false;
    if (/(^|\/)node_modules\//.test(f)) return false;
    return true;
  });
  if (binInSrc.length > 0) {
    findings.push({
      rule: name,
      severity: "medium",
      title: `Binary assets committed outside asset dirs (${binInSrc.length})`,
      detail: binInSrc.slice(0, 20).map((f) => `- ${f}`).join("\n") + (binInSrc.length > 20 ? `\n...and ${binInSrc.length - 20} more` : ""),
      files: binInSrc.slice(0, 20).map((f) => ({ path: f, line: 1 })),
      savings: "Keeps repo lean; binaries don't diff well and slow clones.",
      fixPrompt: `Move these binary files into an assets/public directory or to object storage: ${binInSrc.slice(0, 20).join(", ")}.`,
    });
  }

  // 3. Secrets in tracked files
  const secretHits = [];
  for (const [p, c] of fileContents.entries()) {
    if (p.includes("node_modules")) continue;
    if (p.endsWith(".env.example") || p.endsWith(".env.sample")) continue;
    for (const re of SECRET_PATTERNS) {
      if (re.test(c)) { secretHits.push(p); break; }
    }
  }
  if (secretHits.length > 0) {
    findings.push({
      rule: name,
      severity: "critical",
      title: `Possible secrets committed (${secretHits.length} files)`,
      detail: secretHits.map((f) => `- ${f}`).join("\n") +
        "\n\nCommitted secrets = breach risk + forced rotation cost. Also bloats history permanently.",
      files: secretHits.map((f) => ({ path: f, line: 1 })),
      savings: "Avoids breach/incident cost (often $$$$).",
      fixPrompt: `Remove secrets from these files and rotate the credentials immediately: ${secretHits.join(", ")}. Move to env vars / secret manager and add to .gitignore. Use git filter-repo to purge history.`,
    });
  }

  // 4. Duplicate filenames (possible copy-paste bloat)
  const nameCount = new Map();
  for (const f of files) {
    const base = f.split("/").pop();
    nameCount.set(base, (nameCount.get(base) || 0) + 1);
  }
  const dupes = [...nameCount.entries()].filter(([, n]) => n > 3).map(([n]) => n);
  if (dupes.length > 0) {
    findings.push({
      rule: name,
      severity: "low",
      title: `Repeated filenames (${dupes.length} basenames appear >3x)`,
      detail: dupes.slice(0, 15).map((d) => `- ${d}`).join("\n"),
      files: [],
      savings: "Often indicates copy-paste duplication; dedup reduces maintenance + bundle.",
      fixPrompt: `Review these repeatedly-named files for duplication: ${dupes.slice(0, 15).join(", ")}. Extract shared components/utilities.`,
    });
  }

  // 5. Committed node_modules / vendor / .git
  const badDirs = files.filter((f) => /(^|\/)(node_modules|vendor|\.git|__pycache__|\.venv|venv|target|dist|build)\//.test(f));
  if (badDirs.length > 5) {
    findings.push({
      rule: name,
      severity: "high",
      title: `Build/dependency directories committed (${badDirs.length} files)`,
      detail: `Found committed files under node_modules/vendor/.git/__pycache__/.venv/target/dist/build. This bloats the repo massively.`,
      files: badDirs.slice(0, 10).map((f) => ({ path: f, line: 1 })),
      savings: "Can shrink repo by 90%+.",
      fixPrompt: `Add these to .gitignore and remove from git tracking: node_modules, vendor, .git (nested), __pycache__, .venv, target, dist, build. Run git rm -r --cached.`,
    });
  }

  return findings;
}
