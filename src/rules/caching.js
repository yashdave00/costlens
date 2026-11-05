// Missing caching on data fetching — uncached requests burn compute + DB.
export const name = "caching";
const BEFORE_AFTER = { before: "Uncached origin requests", after: "Cached responses", savingsUsd: 100, savingsPct: "80-99% fewer origin requests" };

const JS_EXTS = [".js", ".jsx", ".ts", ".tsx"];

function isTestPath(p) {
  return /test|spec|fixture/i.test(p);
}

function isViewLikePath(p) {
  return /views|controllers|routes|handlers|endpoints/i.test(p);
}

function isStaticAssetPath(p) {
  if (/(^|\/)(static|assets|public|dist|build|out|vendor|media|images)\//i.test(p)) return true;
  return /\.(css|scss|less|sass|styl|png|jpe?g|gif|svg|ico|webp|avif|bmp|tiff?|woff2?|ttf|otf|eot|map|html?|htm|md|txt|json|lock|toml|yaml|yml|xml|csv)$/i.test(p);
}

function pushFinding(findings, title, hits, savings, fixPrompt, severity = "medium") {
  if (!hits || hits.length === 0) return;
  const uniq = dedup(hits).slice(0, 25);
  if (uniq.length === 0) return;
  findings.push({
    rule: name,
    severity,
    title: `${title} (${uniq.length})`,
    detail: uniq.map((h) => `- ${h.path}:${h.line} — \`${h.snippet}\``).join("\n") +
      (uniq.length >= 25 ? `\n...and more` : ""),
    files: uniq.map((h) => ({ path: h.path, line: h.line })),
    savings,
    beforeAfter: BEFORE_AFTER,
    fixPrompt: `${fixPrompt} Files: ${uniq.map((h) => h.path + ":" + h.line).join(", ")}.`,
  });
}

function dedup(hits) {
  const seen = new Set();
  return hits.filter((h) => {
    const k = h.path + ":" + h.line;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function isComment(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("#") || t.startsWith("/*");
}

export async function run({ root, files, fileContents }) {
  const findings = [];
  const flaggedFiles = new Set();

  // Framework detection: require an actual import / manifest signal, not a stray mention.
  const allContent = [...fileContents.values()].join("\n");
  const hasDjango =
    /(^|\n)\s*(from\s+django|import\s+django)\b/m.test(allContent) ||
    fileContents.has("manage.py") ||
    /"django"\s*:/.test(fileContents.get("requirements.txt") || "");
  const hasFlask =
    /(^|\n)\s*(from\s+flask|import\s+flask)\b/m.test(allContent);
  const hasRails =
    /Rails::|require\s+['"]rails['"]|ActiveRecord::Base/.test(allContent) ||
    /gem\s+['"]rails['"]/.test(fileContents.get("Gemfile") || "");
  // 1. fetch() without cache/revalidate/next options (JS/TS)
  const fetchHits = [];
  for (const [p, c] of fileContents.entries()) {
    if (isTestPath(p)) continue;
    if (!JS_EXTS.some((e) => p.endsWith(e))) continue;
    const lines = c.split("\n");
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (isComment(line)) return;
      if (!/\bfetch\s*\(/.test(line)) return;
      const ctx = lines.slice(i, i + 4).join(" ");
      if (/cache\s*:|revalidate\s*:|next\s*:\s*\{|no-store|force-cache/.test(ctx)) return;
      if (/useEffect|onClick|onChange|onSubmit/.test((lines[Math.max(0, i - 3)] || "") + " " + line)) return;
      fetchHits.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 120) });
    });
  }
  const fetchCapped = fetchHits.slice(0, 25);
  if (fetchCapped.length > 0) {
    findings.push({
      rule: name,
      severity: "medium",
      title: `fetch() without explicit caching (${fetchCapped.length})`,
      detail: fetchCapped.map((h) => `- ${h.path}:${h.line} — \`${h.snippet}\``).join("\n") +
        (fetchHits.length > 25 ? `\n...and ${fetchHits.length - 25} more` : ""),
      files: fetchCapped.map((h) => ({ path: h.path, line: h.line })),
      savings: "Adding revalidate/cache can cut origin requests 80-99% for read-heavy pages.",
      beforeAfter: BEFORE_AFTER,
      fixPrompt: `Add caching to these fetch calls (Next.js: fetch(url, { next: { revalidate: N } }) or { cache: 'force-cache' }). Files: ${fetchCapped.map((h) => h.path + ":" + h.line).join(", ")}.`,
    });
    fetchCapped.forEach((h) => flaggedFiles.add(h.path));
  }

  // 2. Next.js pages without revalidate/export (dynamic rendering everywhere)
  const pageFiles = [...fileContents.keys()].filter((p) => /\/(page|layout)\.(js|jsx|ts|tsx)$/.test(p) && !isTestPath(p));
  const hasRevalidate = [...fileContents.values()].some((c) => /revalidate\s*=/.test(c));
  if (pageFiles.length >= 5 && !hasRevalidate) {
    const cappedPages = pageFiles.slice(0, 25);
    findings.push({
      rule: name,
      severity: "medium",
      title: `No ISR/revalidate found across ${pageFiles.length} pages`,
      detail: "None of the scanned files set `revalidate`. Every request may hit the origin + DB, increasing compute and cost.",
      files: cappedPages.map((p) => ({ path: p, line: 1 })),
      savings: "ISR can reduce function invocations 90%+ for content-ish pages.",
      beforeAfter: BEFORE_AFTER,
      fixPrompt: `Add \`export const revalidate = 60;\` (or appropriate interval) to static-ish page/layout components. Consider generateStaticParams for dynamic routes.`,
    });
  }

  // Helper to collect line hits
  function collectHits(entries, lineTest) {
    const hits = [];
    for (const [p, c] of entries) {
      const lines = c.split("\n");
      lines.forEach((line, i) => {
        if (isComment(line)) return;
        if (lineTest(line)) {
          hits.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 120) });
        }
      });
    }
    return hits;
  }

  // 3. Python / Django
  if (hasDjango) {
  const djangoHits = [];
  for (const [p, c] of fileContents.entries()) {
    if (!p.endsWith(".py")) continue;
    if (isTestPath(p)) continue;
    if (!isViewLikePath(p)) continue;
    if (flaggedFiles.has(p)) continue;
    if (!/django|models|request|objects|HttpResponse|render\(|APIView|View\b/i.test(c)) continue;
    if (!/\b(\.objects\b|QuerySet|cursor\.execute|connection\.cursor|select_related|prefetch_related|\.filter\(|\.exclude\(|\.annotate\(|\.aggregate\()/i.test(c)) continue;
    if (/@cache_page|@cache_control|cache\.set\(|cache\.get\(|cache\.get_or_set/i.test(c)) continue;
    const lines = c.split("\n");
    let hits = [];
    lines.forEach((line, i) => {
      if (isComment(line)) return;
      if (/\b(\.objects\b|QuerySet|cursor\.execute|connection\.cursor|select_related|prefetch_related|\.filter\(|\.exclude\(|\.annotate\(|\.aggregate\()/i.test(line)) {
        hits.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 120) });
      }
    });
    if (hits.length === 0) {
      const idx = lines.findIndex((l) => /^\s*def\s+\w+/.test(l));
      if (idx >= 0) hits.push({ path: p, line: idx + 1, snippet: lines[idx].trim().slice(0, 120) });
    }
    djangoHits.push(...hits);
    hits.forEach((h) => flaggedFiles.add(h.path));
  }
  pushFinding(findings, "Python/Django views missing caching", djangoHits,
    "Adding @cache_page/@cache_control or cache.get/set can cut DB load 80-99% for read-heavy views.",
    "Add Django caching (@cache_page/@cache_control or cache.get/set) to these views:");
  }

  // 4. Python / Flask
  if (hasFlask) {
  const flaskHits = [];
  for (const [p, c] of fileContents.entries()) {
    if (!p.endsWith(".py")) continue;
    if (isTestPath(p)) continue;
    if (!isViewLikePath(p)) continue;
    if (flaggedFiles.has(p)) continue;
    if (!/flask|@.*\.route|render_template|jsonify|request|db\./i.test(c)) continue;
    if (!/\bdb\.|session\.|\.query|execute|fetchall|fetchone|sqlalchemy/i.test(c)) continue;
    if (/@cache\.cached|cache\.get\(|cache\.set\(|cache\.memoize/i.test(c)) continue;
    const lines = c.split("\n");
    let hits = [];
    lines.forEach((line, i) => {
      if (isComment(line)) return;
      if (/\bdb\.|session\.|\.query|execute|fetchall|fetchone|sqlalchemy/i.test(line)) {
        hits.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 120) });
      }
    });
    if (hits.length === 0) {
      const idx = lines.findIndex((l) => /@.*\.route|def\s+\w+/.test(l));
      if (idx >= 0) hits.push({ path: p, line: idx + 1, snippet: lines[idx].trim().slice(0, 120) });
    }
    flaskHits.push(...hits);
    hits.forEach((h) => flaggedFiles.add(h.path));
  }
  pushFinding(findings, "Python/Flask routes missing caching", flaskHits,
    "Adding @cache.cached()/cache.get/set can cut DB load 80-99% for read-heavy routes.",
    "Add Flask caching (@cache.cached() or cache.get/set) to these routes:");
  }

  // 5. Go
  const goHits = [];
  for (const [p, c] of fileContents.entries()) {
    if (!p.endsWith(".go")) continue;
    if (isTestPath(p)) continue;
    if (flaggedFiles.has(p)) continue;
    if (!/http\.HandleFunc|http\.Handle\b|ResponseWriter|http\.ServeFile|gin\.|echo\.|fiber\.|chi\.|mux\./i.test(c)) continue;
    if (/Cache-Control|ETag|Last-Modified|max-age|stale-while-revalidate/i.test(c)) continue;
    const lines = c.split("\n");
    let hits = [];
    lines.forEach((line, i) => {
      if (isComment(line)) return;
      if (/http\.HandleFunc|http\.Handle\b|ResponseWriter|http\.ServeFile|gin\.|echo\.|fiber\.|chi\.|mux\.|w\.Write|c\.JSON|ctx\./i.test(line)) {
        hits.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 120) });
      }
    });
    if (hits.length === 0) {
      const idx = lines.findIndex((l) => /func\s+/.test(l));
      if (idx >= 0) hits.push({ path: p, line: idx + 1, snippet: lines[idx].trim().slice(0, 120) });
    }
    goHits.push(...hits);
    hits.forEach((h) => flaggedFiles.add(h.path));
  }
  pushFinding(findings, "Go HTTP responses missing caching", goHits,
    "Adding Cache-Control headers/caching middleware can cut origin load 60-95%.",
    "Add HTTP caching (Cache-Control headers or caching middleware) to these Go handlers:");

  // 6. PHP / Laravel controllers
  const phpHits = [];
  for (const [p, c] of fileContents.entries()) {
    if (!p.endsWith(".php")) continue;
    if (isTestPath(p)) continue;
    if (flaggedFiles.has(p)) continue;
    if (!/Route::|Controller|Illuminate|Eloquent|DB::/i.test(c)) continue;
    if (!/::all\(|::find|::where|DB::|->get\(\)|->first\(\)|->paginate|Eloquent/i.test(c)) continue;
    if (/Cache::remember|Cache::get|Cache::put|Cache::forget|cache\(/i.test(c)) continue;
    const lines = c.split("\n");
    let hits = [];
    lines.forEach((line, i) => {
      if (isComment(line)) return;
      if (/::all\(|::find|::where|DB::|->get\(\)|->first\(\)|->paginate|Eloquent/i.test(line)) {
        hits.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 120) });
      }
    });
    if (hits.length === 0) {
      const idx = lines.findIndex((l) => /function\s+\w+|class\s+\w+/.test(l));
      if (idx >= 0) hits.push({ path: p, line: idx + 1, snippet: lines[idx].trim().slice(0, 120) });
    }
    phpHits.push(...hits);
    hits.forEach((h) => flaggedFiles.add(h.path));
  }
  pushFinding(findings, "PHP/Laravel controllers missing caching", phpHits,
    "Adding Cache::remember/get/put can cut DB load 80-99% for read-heavy controllers.",
    "Add Laravel caching (Cache::remember/get/put) to these controllers:");

  // PHP / Laravel route caching
  const phpFiles = [...fileContents.keys()].filter((p) => p.endsWith(".php") && !isTestPath(p));
  const hasRoutes = phpFiles.some((p) => /routes[\\/].*\.php|web\.php|api\.php/i.test(p));
  const hasRouteCacheCmd = [...fileContents.values()].some((c) => /route:cache/i.test(c));
  if (phpFiles.length > 0 && hasRoutes && !hasRouteCacheCmd) {
    const routeFiles = phpFiles.filter((p) => /routes[\\/].*\.php|web\.php|api\.php/i.test(p)).slice(0, 25);
    const hits = routeFiles.length
      ? routeFiles.map((p) => ({ path: p, line: 1, snippet: "missing php artisan route:cache" }))
      : [{ path: phpFiles[0], line: 1, snippet: "missing php artisan route:cache" }];
    hits.forEach((h) => flaggedFiles.add(h.path));
    findings.push({
      rule: name,
      severity: "medium",
      title: `PHP/Laravel missing route caching (php artisan route:cache) (${hits.length})`,
      detail: hits.map((h) => `- ${h.path}:${h.line} — \`${h.snippet}\``).join("\n"),
      files: hits.map((h) => ({ path: h.path, line: h.line })),
      savings: "Route caching speeds up route registration and cuts bootstrap cost.",
      beforeAfter: BEFORE_AFTER,
      fixPrompt: `Run \`php artisan route:cache\` (and config:cache) for production; ensure routes are cacheable. Files: ${hits.map((h) => h.path + ":" + h.line).join(", ")}.`,
    });
  }

  // 7. Ruby / Rails
  if (hasRails) {
  const rubyHits = [];
  for (const [p, c] of fileContents.entries()) {
    if (flaggedFiles.has(p)) continue;
    if (isTestPath(p)) continue;
    if (!isViewLikePath(p)) continue;
    const isRb = p.endsWith(".rb");
    const isView = p.endsWith(".erb") || p.endsWith(".html") || p.endsWith(".html.erb");
    if (!isRb && !isView) continue;
    if (isRb) {
      if (!/\b(\.all\b|\.find\b|\.where\b|\.includes\b|\.joins\b|\.order\b|\.pluck\b|ActiveRecord)/i.test(c)) continue;
      if (/Rails\.cache\.fetch|Rails\.cache\.read|Rails\.cache\.write|cache_if|cache_unless/i.test(c)) continue;
    } else {
      if (!/render|<%=|<%/i.test(c)) continue;
      if (/\bcache\b/i.test(c)) continue;
    }
    const lines = c.split("\n");
    let hits = [];
    const testRe = isRb
      ? /\b(\.all\b|\.find\b|\.where\b|\.includes\b|\.joins\b|\.order\b|\.pluck\b|ActiveRecord)/i
      : /render|<%=|<%/i;
    lines.forEach((line, i) => {
      if (isComment(line)) return;
      if (testRe.test(line)) {
        hits.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 120) });
      }
    });
    if (hits.length === 0) {
      const idx = lines.findIndex((l) => (isRb ? /def\s+\w+|class\s+\w+/.test(l) : /render|<%/ .test(l)));
      if (idx >= 0) hits.push({ path: p, line: idx + 1, snippet: lines[idx].trim().slice(0, 120) });
    }
    rubyHits.push(...hits);
    hits.forEach((h) => flaggedFiles.add(h.path));
  }
  pushFinding(findings, "Ruby/Rails missing caching", rubyHits,
    "Adding Rails.cache.fetch or fragment caching can cut DB load 80-99%.",
    "Add Rails caching (Rails.cache.fetch or cache helper/fragment caching) to these files:");
  }

  // 8. Java / Spring
  const javaHits = [];
  for (const [p, c] of fileContents.entries()) {
    if (!p.endsWith(".java")) continue;
    if (isTestPath(p)) continue;
    if (flaggedFiles.has(p)) continue;
    if (!/Repository|EntityManager|JdbcTemplate|findAll|findById|\.query|select|save\(/i.test(c)) continue;
    if (/@Cacheable|@CachePut|@CacheEvict|CacheManager/i.test(c)) continue;
    const lines = c.split("\n");
    let hits = [];
    lines.forEach((line, i) => {
      if (isComment(line)) return;
      if (/Repository|EntityManager|JdbcTemplate|findAll|findById|\.query|select|save\(/i.test(line)) {
        hits.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 120) });
      }
    });
    if (hits.length === 0) {
      const idx = lines.findIndex((l) => /class\s+\w+|public\s+\w+/.test(l));
      if (idx >= 0) hits.push({ path: p, line: idx + 1, snippet: lines[idx].trim().slice(0, 120) });
    }
    javaHits.push(...hits);
    hits.forEach((h) => flaggedFiles.add(h.path));
  }
  pushFinding(findings, "Java/Spring missing caching", javaHits,
    "Adding @Cacheable/@CachePut/CacheManager can cut DB load 80-99%.",
    "Add Spring caching (@Cacheable/@CachePut/CacheManager) to these components:");

  // 9. General: HTTP responses without Cache-Control/ETag/Last-Modified
  // Require a real web-framework response call, not a bare `Response(` type.
  const respRe = /\b(res\.(send|json|end|status)\s*\(|HttpResponse\s*\(|ResponseEntity|JsonResponse|c\.(JSON|String|HTML)\s*\(|ctx\.(JSON|String|HTML)\s*\(|w\.Write\s*\(|ResponseWriter|HttpServletResponse|NextResponse\.(json|redirect)\s*\()/;
  const cacheHeaderRe = /Cache-Control|ETag|Last-Modified|stale-while-revalidate|max-age/i;
  const httpHits = [];
  for (const [p, c] of fileContents.entries()) {
    if (isTestPath(p)) continue;
    if (isStaticAssetPath(p)) continue;
    if (flaggedFiles.has(p)) continue;
    const lines = c.split("\n");
    const setsResp = (line) => {
      const t = line.trim();
      if (/^(import|from|require|export)\b/.test(t)) return false;
      if (isComment(line)) return false;
      if (!respRe.test(line)) return false;
      if (/\breturn\b/.test(line)) return true;
      if (/\b(res\.(send|json|end|status)|c\.(JSON|String|HTML)|HttpResponse|ResponseEntity|Response|jsonify|render|NextResponse\.\w+|w\.Write)\s*\(/.test(line)) return true;
      if (/ctx\.\w+\s*\(/.test(line)) return true;
      return false;
    };
    if (!lines.some(setsResp)) continue;
    if (cacheHeaderRe.test(c)) continue;
    let hits = [];
    lines.forEach((line, i) => {
      if (setsResp(line)) {
        hits.push({ path: p, line: i + 1, snippet: line.trim().slice(0, 120) });
      }
    });
    if (hits.length === 0) {
      const idx = lines.findIndex((l) => setsResp(l));
      if (idx >= 0) hits.push({ path: p, line: idx + 1, snippet: lines[idx].trim().slice(0, 120) });
    }
    httpHits.push(...hits);
    hits.forEach((h) => flaggedFiles.add(h.path));
  }
  pushFinding(findings, "HTTP responses without Cache-Control/ETag/Last-Modified", httpHits,
    "Adding Cache-Control/ETag/Last-Modified can cut origin load 60-95%.",
    "Add cache headers (Cache-Control, ETag, Last-Modified) to these responses:");

  // 10. Missing CDN cache configuration
  const allContentForCdn = [...fileContents.values()].join("\n");
  const hasCdnConfig = /_headers|vercel\.json|netlify\.toml|cloudfront|Vercel-CDN-Cache-Control|stale-while-revalidate.*immutable|s-maxage/i.test(allContentForCdn);
  const webishFiles = [...fileContents.keys()].filter((p) => /\.(js|ts|jsx|tsx|go|php|rb|java|html|erb)$/.test(p) && !isTestPath(p));
  const hasWebResponses = [...fileContents.values()].some((c) => respRe.test(c) || /Route::|app\.(get|post|route)\s*\(|@app\.(route|get|post)|http\.HandleFunc|router\.(GET|POST)/.test(c));
  if (webishFiles.length >= 3 && hasWebResponses && !hasCdnConfig) {
    const hits = webishFiles.slice(0, 25).map((p) => ({ path: p, line: 1, snippet: "missing CDN cache configuration" }));
    hits.forEach((h) => flaggedFiles.add(h.path));
    findings.push({
      rule: name,
      severity: "medium",
      title: `Missing CDN cache configuration (${hits.length})`,
      detail: hits.map((h) => `- ${h.path}:${h.line} — \`${h.snippet}\``).join("\n"),
      files: hits.map((h) => ({ path: h.path, line: h.line })),
      savings: "CDN caching can cut origin load 60-95%.",
      beforeAfter: BEFORE_AFTER,
      fixPrompt: `Configure CDN/cache headers (Cache-Control, s-maxage, stale-while-revalidate, immutable) via vercel.json/_headers/nginx. Files: ${hits.map((h) => h.path + ":" + h.line).join(", ")}.`,
    });
  }

  return findings;
}