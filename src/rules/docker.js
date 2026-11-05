// Docker image size reduction checks: multi-stage builds, base image, layer optimization, .dockerignore.
export const name = "docker";

export async function run({ root, files, fileContents }) {
  const findings = [];

  function isSkippedDockerPath(p) {
    if (/(^|\/)(test|tests|fixture|fixtures|template|templates)\//i.test(p)) return true;
    const base = p.split("/").pop().toLowerCase();
    if (base === "dockerfile.tt" || base === "dockerfile.test") return true;
    if (/^dockerfile\.(tt|test|spec|fixture|template)$/i.test(base)) return true;
    return false;
  }
  const dockerfiles = [...fileContents.keys()].filter((p) => {
    if (isSkippedDockerPath(p)) return false;
    return /(^|\/)Dockerfile(\.|$)/i.test(p) || p.toLowerCase().endsWith(".dockerfile");
  });
  if (dockerfiles.length === 0) return findings;

  for (const df of dockerfiles) {
    const content = fileContents.get(df) || "";
    const lines = content.split("\n");

    // 1. Check for multi-stage build
    const fromLines = lines.filter((l) => /^\s*FROM\s/i.test(l));
    const hasMultiStage = fromLines.length > 1;
    const hasBuilderStage = /FROM\s+.*\s+AS\s+/i.test(content);

    if (!hasMultiStage) {
      findings.push({
        rule: name,
        severity: "high",
        title: `No multi-stage build in ${df}`,
        detail: `Single-stage Dockerfile. Build tools, dev dependencies, and source code all end up in the final image.\n\n**Before:** Full build environment in production image (often 1-2GB+)\n**After:** Multi-stage build keeps only runtime artifacts (often 50-200MB)`,
        files: [{ path: df, line: 1 }],
        savings: "Multi-stage builds typically reduce image size 60-90%.",
        beforeAfter: { before: "1.2GB (estimated)", after: "150MB (estimated)", savingsUsd: 0, savingsPct: "60-90%" },
        fixPrompt: `Convert ${df} to a multi-stage build: use a builder stage (FROM node:20 AS builder) to install deps and build, then a runtime stage (FROM node:20-alpine) that copies only the build output. Remove build tools from the final image.`,
      });
    }

    // 2. Check for slim/alpine/distroless base image
    const baseImages = fromLines.map((l) => l.trim());
    const usesFullImage = baseImages.some((l) =>
      /FROM\s+(node|python|golang|golang|java|openjdk|ubuntu|debian|centos|fedora|amazonlinux)(?::\d+)?\s*$/i.test(l) ||
      /FROM\s+(node|python|golang|java|openjdk|ubuntu|debian):latest/i.test(l)
    );
    const usesSlim = baseImages.some((l) => /alpine|slim|distroless|scratch/i.test(l));

    if (usesFullImage && !usesSlim) {
      findings.push({
        rule: name,
        severity: "medium",
        title: `Full base image in ${df}`,
        detail: `Using full OS base image (e.g., node:20, python:3.12, ubuntu). Slim/alpine variants are 50-80% smaller.\n\n**Before:** Full base image (~900MB-1.2GB)\n**After:** Alpine/slim variant (~50-200MB)`,
        files: [{ path: df, line: 1 }],
        savings: "Switching to alpine/slim typically reduces base image size 50-80%.",
        beforeAfter: { before: "1.0GB (estimated)", after: "150MB (estimated)", savingsPct: "50-80%" },
        fixPrompt: `Replace full base images with alpine/slim variants in ${df}: node:20 → node:20-alpine, python:3.12 → python:3.12-slim, golang:1.22 → golang:1.22-alpine. Verify compatibility (some native deps need full image).`,
      });
    }

    // 3. Check for .dockerignore
    const hasDockerignore = files.some((f) => /(^|\/)\.dockerignore$/.test(f));
    if (!hasDockerignore) {
      findings.push({
        rule: name,
        severity: "medium",
        title: `No .dockerignore in project`,
        detail: `Without .dockerignore, the entire build context (including node_modules, .git, test files) is sent to the Docker daemon.\n\n**Before:** Full repo copied as build context (can be 100MB-1GB+)\n**After:** Only necessary files copied (typically 1-10MB)`,
        files: [{ path: df, line: 1 }],
        savings: "Adding .dockerignore typically reduces build context 80-95% and speeds up builds.",
        beforeAfter: { before: "500MB (estimated)", after: "10MB (estimated)", savingsPct: "80-95%" },
        fixPrompt: `Create a .dockerignore file in the project root. Exclude: node_modules, .git, .env, *.md, tests/, docs/, .github/, dist/, build/, coverage/, *.log.`,
      });
    }

    // 4. Check for apt-get/apk without cleanup
    const hasUncleanedInstall = lines.some((l) =>
      /RUN\s+.*(apt-get|apk|yum|dnf)\s+install/i.test(l) &&
      !/rm\s+-rf\s+\/var\/lib\/(apt|apk|dpkg)/i.test(l) &&
      !/apt-get\s+clean/i.test(l) &&
      !/--no-cache/i.test(l)
    );
    if (hasUncleanedInstall) {
      findings.push({
        rule: name,
        severity: "medium",
        title: `Package manager cache not cleaned in ${df}`,
        detail: `RUN install commands without cleaning package manager cache. Cached packages bloat the image layer.\n\n**Before:** Image includes package cache (~50-200MB extra)\n**After:** Cache cleaned, only installed packages remain`,
        files: [{ path: df, line: 1 }],
        savings: "Cleaning package cache typically saves 50-200MB per image.",
        beforeAfter: { before: "+100MB cache (estimated)", after: "0MB (cleaned)", savingsPct: "50-200MB" },
        fixPrompt: `Add cleanup to install commands in ${df}: for apt: \`RUN apt-get update && apt-get install -y ... && rm -rf /var/lib/apt/lists/*\`. For apk: \`RUN apk add --no-cache ...\`. For yum: \`RUN yum install -y ... && yum clean all\`.`,
      });
    }

    // 5. Check for COPY . . (copying everything)
    const hasCopyAll = lines.some((l) => /^\s*COPY\s+\.\s+\.\s*$/i.test(l) || /^\s*COPY\s+\.\s+\/\s*$/i.test(l));
    if (hasCopyAll) {
      findings.push({
        rule: name,
        severity: "low",
        title: `COPY . . in ${df}`,
        detail: `Copying entire build context into the image. Even with .dockerignore, this can include unnecessary files.\n\n**Before:** Entire context copied (risk of secrets, tests, docs in image)\n**After:** Specific files/directories copied`,
        files: [{ path: df, line: 1 }],
        savings: "Selective COPY reduces image size and prevents secret leakage.",
        beforeAfter: { before: "All context files", after: "Only needed files" },
        fixPrompt: `Replace \`COPY . .\` in ${df} with specific copies: \`COPY package*.json ./\`, \`COPY src/ ./src/\`, etc. This reduces image size and prevents accidental secret inclusion.`,
      });
    }

    // 6. Check for using 'latest' tag
    const usesLatest = fromLines.some((l) => /:latest\b/i.test(l));
    if (usesLatest) {
      findings.push({
        rule: name,
        severity: "low",
        title: `Using :latest tag in ${df}`,
        detail: `Using :latest tag means builds are not reproducible and may pull larger images over time.\n\n**Before:** Unpinned image (may grow over time)\n**After:** Pinned version tag (predictable size)`,
        files: [{ path: df, line: 1 }],
        savings: "Pinning versions ensures consistent, optimizable image sizes.",
        beforeAfter: { before: "Variable", after: "Pinned" },
        fixPrompt: `Pin base image versions in ${df}: replace :latest with specific version tags (e.g., node:20.11-alpine, python:3.12.2-slim). This ensures reproducible builds and consistent image sizes.`,
      });
    }

    // 7. Check for running as root (no USER directive)
    const hasUser = lines.some((l) => /^\s*USER\s/i.test(l));
    if (!hasUser && fromLines.length > 0) {
      findings.push({
        rule: name,
        severity: "low",
        title: `No USER directive in ${df}`,
        detail: `Container runs as root by default. While not directly a size issue, running as non-root enables smaller base images (distroless, scratch) that don't include root user.\n\n**Before:** Root user (requires full OS image)\n**After:** Non-root user (enables distroless/scratch images)`,
        files: [{ path: df, line: 1 }],
        savings: "Non-root enables distroless images (often 10-50MB vs 100MB+).",
        beforeAfter: { before: "100MB+ (full image)", after: "10-50MB (distroless)" },
        fixPrompt: `Add a non-root user in ${df}: \`RUN addgroup -S appgroup && adduser -S appuser -G appgroup\` then \`USER appuser\`. This enables use of distroless/scratch base images for minimal size.`,
      });
    }
  }

  return findings;
}
