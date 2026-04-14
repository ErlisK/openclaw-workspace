/**
 * lib/docsci-config.ts
 *
 * docsci.yml — per-repo CI configuration file
 *
 * Placed in the root of the repository. Loaded by the run orchestrator before
 * executing any analyzers. All fields are optional; defaults apply.
 *
 * Schema (YAML):
 * ─────────────────────────────────────────────────────────────────
 * version: 1                          # config schema version
 *
 * docs:
 *   path: docs                        # folder containing Markdown files
 *   include:                          # glob patterns to include (default: **\/*.md)
 *     - "docs/**\/*.md"
 *     - "guides/**\/*.md"
 *   exclude:                          # glob patterns to exclude
 *     - "docs/internal/**"
 *     - "**\/CHANGELOG.md"
 *
 * openapi:
 *   path: openapi.yaml                # path in repo (relative)
 *   url: https://api.example.com/spec # remote URL (takes precedence over path)
 *
 * runtimes:
 *   python: "3.11"                    # python version tag (informational, sandbox uses Pyodide)
 *   node: "20"                        # Node.js version (informational, sandbox uses isolated-vm)
 *
 * snippets:
 *   timeout_seconds: 20               # per-snippet execution timeout (max: 60)
 *   languages:                        # which languages to execute (default: all supported)
 *     - python
 *     - javascript
 *     - typescript
 *   skip_patterns:                    # skip snippets whose content matches these strings
 *     - "# docsci: skip"
 *     - "// docsci: skip"
 *
 * security:
 *   network_isolated: false           # block all outbound network from sandbox
 *   allowlist:                        # domains sandbox may call
 *     - api.example.com
 *     - "*.stripe.com"
 *
 * checks:
 *   accessibility: true               # run a11y checks (default: true)
 *   copy_lint: true                   # run copy linting (default: true)
 *   drift_detection: true             # run API drift detection (default: true)
 *   snippets: true                    # run snippet execution (default: true)
 * ─────────────────────────────────────────────────────────────────
 */

import * as yaml from "js-yaml";

// ── Schema types ──────────────────────────────────────────────────────────────

export interface DocsConfig {
  version?: number;
  docs?: DocsSection;
  openapi?: OpenApiSection;
  runtimes?: RuntimesSection;
  snippets?: SnippetsSection;
  security?: SecuritySection;
  checks?: ChecksSection;
}

export interface DocsSection {
  path?: string;
  include?: string[];
  exclude?: string[];
}

export interface OpenApiSection {
  path?: string;
  url?: string;
}

export interface RuntimesSection {
  python?: string;
  node?: string;
}

export interface SnippetsSection {
  timeout_seconds?: number;
  languages?: string[];
  skip_patterns?: string[];
}

export interface SecuritySection {
  network_isolated?: boolean;
  allowlist?: string[];
}

export interface ChecksSection {
  accessibility?: boolean;
  copy_lint?: boolean;
  drift_detection?: boolean;
  snippets?: boolean;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const CONFIG_DEFAULTS: Required<DocsConfig> = {
  version: 1,
  docs: {
    path: "docs",
    include: ["**/*.md", "**/*.mdx"],
    exclude: [],
  },
  openapi: {
    path: undefined as unknown as string,
    url: undefined as unknown as string,
  },
  runtimes: {
    python: "3.11",
    node: "20",
  },
  snippets: {
    timeout_seconds: 20,
    languages: ["python", "javascript", "typescript"],
    skip_patterns: ["# docsci: skip", "// docsci: skip", "docsci:skip"],
  },
  security: {
    network_isolated: false,
    allowlist: [],
  },
  checks: {
    accessibility: true,
    copy_lint: true,
    drift_detection: true,
    snippets: true,
  },
};

// ── Effective config (parsed + merged with defaults) ──────────────────────────

export interface EffectiveConfig {
  version: number;
  docs: {
    path: string;
    include: string[];
    exclude: string[];
  };
  openapi: {
    path: string | null;
    url: string | null;
  };
  runtimes: {
    python: string;
    node: string;
  };
  snippets: {
    timeout_ms: number;  // converted from timeout_seconds
    languages: string[];
    skip_patterns: string[];
  };
  security: {
    network_isolated: boolean;
    allowlist: string[];
  };
  checks: {
    accessibility: boolean;
    copy_lint: boolean;
    drift_detection: boolean;
    snippets: boolean;
  };
}

// ── Supported languages ───────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = new Set(["python", "javascript", "typescript", "js", "ts", "py"]);
const MAX_TIMEOUT_SECONDS = 60;
const MIN_TIMEOUT_SECONDS = 1;

// ── Validation ────────────────────────────────────────────────────────────────

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: EffectiveConfig;
}

export function validateConfig(raw: unknown): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Must be an object
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    errors.push("Config must be a YAML object at the top level");
    return { valid: false, errors, warnings, config: buildEffective({}) };
  }

  const cfg = raw as DocsConfig;

  // version
  if (cfg.version !== undefined && cfg.version !== 1) {
    warnings.push(`Unknown config version ${cfg.version}; expected 1`);
  }

  // docs.path
  if (cfg.docs?.path !== undefined && typeof cfg.docs.path !== "string") {
    errors.push("docs.path must be a string");
  }

  // docs.include / exclude
  if (cfg.docs?.include !== undefined && !Array.isArray(cfg.docs.include)) {
    errors.push("docs.include must be an array of glob strings");
  }
  if (cfg.docs?.exclude !== undefined && !Array.isArray(cfg.docs.exclude)) {
    errors.push("docs.exclude must be an array of glob strings");
  }

  // openapi.url
  if (cfg.openapi?.url !== undefined) {
    try {
      new URL(cfg.openapi.url);
    } catch {
      errors.push(`openapi.url is not a valid URL: ${cfg.openapi.url}`);
    }
  }

  // snippets.timeout_seconds
  if (cfg.snippets?.timeout_seconds !== undefined) {
    const t = cfg.snippets.timeout_seconds;
    if (typeof t !== "number" || !Number.isFinite(t)) {
      errors.push("snippets.timeout_seconds must be a number");
    } else if (t < MIN_TIMEOUT_SECONDS) {
      errors.push(`snippets.timeout_seconds must be >= ${MIN_TIMEOUT_SECONDS}`);
    } else if (t > MAX_TIMEOUT_SECONDS) {
      warnings.push(
        `snippets.timeout_seconds ${t} exceeds max ${MAX_TIMEOUT_SECONDS}; clamped to ${MAX_TIMEOUT_SECONDS}`
      );
    }
  }

  // snippets.languages
  if (cfg.snippets?.languages !== undefined) {
    if (!Array.isArray(cfg.snippets.languages)) {
      errors.push("snippets.languages must be an array of language strings");
    } else {
      for (const lang of cfg.snippets.languages) {
        if (!SUPPORTED_LANGUAGES.has(lang)) {
          warnings.push(
            `snippets.languages: "${lang}" is not a supported runtime (supported: python, javascript, typescript)`
          );
        }
      }
    }
  }

  // security.allowlist
  if (cfg.security?.allowlist !== undefined && !Array.isArray(cfg.security.allowlist)) {
    errors.push("security.allowlist must be an array of domain strings");
  }

  // checks
  for (const key of ["accessibility", "copy_lint", "drift_detection", "snippets"] as const) {
    const val = cfg.checks?.[key];
    if (val !== undefined && typeof val !== "boolean") {
      errors.push(`checks.${key} must be a boolean (true or false)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config: buildEffective(cfg),
  };
}

// ── Build effective config (merge with defaults, apply clamping) ──────────────

export function buildEffective(cfg: DocsConfig): EffectiveConfig {
  const rawTimeout = cfg.snippets?.timeout_seconds ?? CONFIG_DEFAULTS.snippets.timeout_seconds!;
  const clampedTimeout = Math.min(
    Math.max(rawTimeout, MIN_TIMEOUT_SECONDS),
    MAX_TIMEOUT_SECONDS
  );

  return {
    version: cfg.version ?? 1,
    docs: {
      path: cfg.docs?.path ?? CONFIG_DEFAULTS.docs!.path!,
      include: cfg.docs?.include ?? CONFIG_DEFAULTS.docs!.include!,
      exclude: cfg.docs?.exclude ?? CONFIG_DEFAULTS.docs!.exclude!,
    },
    openapi: {
      path: cfg.openapi?.path ?? null,
      url: cfg.openapi?.url ?? null,
    },
    runtimes: {
      python: cfg.runtimes?.python ?? CONFIG_DEFAULTS.runtimes!.python!,
      node: cfg.runtimes?.node ?? CONFIG_DEFAULTS.runtimes!.node!,
    },
    snippets: {
      timeout_ms: clampedTimeout * 1000,
      languages: cfg.snippets?.languages ?? CONFIG_DEFAULTS.snippets!.languages!,
      skip_patterns: cfg.snippets?.skip_patterns ?? CONFIG_DEFAULTS.snippets!.skip_patterns!,
    },
    security: {
      network_isolated: cfg.security?.network_isolated ?? false,
      allowlist: cfg.security?.allowlist ?? [],
    },
    checks: {
      accessibility: cfg.checks?.accessibility ?? true,
      copy_lint: cfg.checks?.copy_lint ?? true,
      drift_detection: cfg.checks?.drift_detection ?? true,
      snippets: cfg.checks?.snippets ?? true,
    },
  };
}

// ── Parse ─────────────────────────────────────────────────────────────────────

/**
 * Parse docsci.yml content string and return a validated EffectiveConfig.
 * Never throws — always returns a result object.
 */
export function parseDocsConfig(yamlContent: string): ConfigValidationResult {
  let raw: unknown;
  try {
    raw = yaml.load(yamlContent);
  } catch (err) {
    return {
      valid: false,
      errors: [`YAML parse error: ${err instanceof Error ? err.message : String(err)}`],
      warnings: [],
      config: buildEffective({}),
    };
  }

  // Empty / null YAML (e.g. empty file) → use all defaults
  if (raw === null || raw === undefined) {
    return {
      valid: true,
      errors: [],
      warnings: ["Config file is empty; using all defaults"],
      config: buildEffective({}),
    };
  }

  return validateConfig(raw);
}

/**
 * Load and parse docsci.yml from inline text provided in the run input.
 * Falls back to all defaults if configText is null/undefined.
 */
export function loadRunConfig(configText?: string | null): EffectiveConfig {
  if (!configText) return buildEffective({});
  const result = parseDocsConfig(configText);
  // Warnings are logged but config is always returned
  if (!result.valid) {
    console.warn("docsci.yml validation errors:", result.errors);
  }
  return result.config;
}

// ── Snippet skip detection ────────────────────────────────────────────────────

/**
 * Returns true if a code snippet should be skipped based on the configured skip_patterns.
 */
export function shouldSkipSnippet(code: string, config: EffectiveConfig): boolean {
  return config.snippets.skip_patterns.some((pattern) => code.includes(pattern));
}

// ── Glob matching (simple, no external dep) ──────────────────────────────────

/**
 * Simple glob match: supports * (any chars except /) and ** (any chars including /).
 * Used to filter doc files by include/exclude patterns.
 */
export function matchGlob(filePath: string, pattern: string): boolean {
  // Normalize path separators
  const fp = filePath.replace(/\\/g, "/");
  const pat = pattern.replace(/\\/g, "/");

  // Convert glob to regex
  const regexStr = pat
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex specials (except * ?)
    .replace(/\\\*\\\*/g, "§DOUBLESTAR§")   // placeholder for **
    .replace(/\*/g, "[^/]*")                // * → match any except /
    .replace(/§DOUBLESTAR§\//g, "(?:.+/)?") // **/ → optional path segments
    .replace(/§DOUBLESTAR§/g, ".*");        // ** → match anything

  try {
    return new RegExp(`^${regexStr}$`).test(fp);
  } catch {
    return false;
  }
}

/**
 * Filter a list of file paths by include/exclude patterns.
 * If include is empty, all files pass. If a file matches any exclude, it's removed.
 */
export function filterDocFiles(
  filePaths: string[],
  include: string[],
  exclude: string[]
): string[] {
  return filePaths.filter((fp) => {
    // Check includes (any include must match, or include is empty)
    const passesInclude =
      include.length === 0 || include.some((pat) => matchGlob(fp, pat));
    if (!passesInclude) return false;

    // Check excludes (any exclude match removes the file)
    const isExcluded = exclude.some((pat) => matchGlob(fp, pat));
    return !isExcluded;
  });
}
