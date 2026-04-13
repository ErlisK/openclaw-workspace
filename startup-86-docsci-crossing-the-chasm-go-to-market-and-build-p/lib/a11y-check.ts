/**
 * lib/a11y-check.ts
 *
 * Accessibility checker for Markdown docs.
 *
 * Pipeline:
 *   Markdown text
 *     → marked (render to HTML)
 *     → jsdom (DOM environment)
 *     → axe-core (a11y audit)
 *     → A11yReport
 *
 * Also runs structural checks that axe can miss:
 *   - Missing alt text on images
 *   - Heading level skips (h1→h3)
 *   - Links with no text or ambiguous text ("click here", "read more")
 *   - Tables without headers
 *   - Code blocks without language hints (for screen reader context)
 *
 * Output: A11yReport with violations, warnings, passes, and patch suggestions
 */

import { marked } from "marked";
import { JSDOM } from "jsdom";
// axe-core is CJS; load via require to avoid ESM issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const axe = require("axe-core") as typeof import("axe-core");

// ── Types ──────────────────────────────────────────────────────────────────

export type A11ySeverity = "critical" | "serious" | "moderate" | "minor";

export interface A11yFinding {
  ruleId: string;
  impact: A11ySeverity;
  description: string;
  helpUrl?: string;
  /** HTML snippet that triggered the finding */
  html: string;
  /** Approximate line in the original Markdown (best effort) */
  line?: number;
  /** Patch suggestion */
  suggestion: string;
  /** Human-readable fix */
  fix: string;
  source: "axe" | "structural";
}

export interface A11yReport {
  /** Number of axe violations */
  violations: number;
  /** Number of structural warnings */
  warnings: number;
  /** Number of axe passes */
  passes: number;
  findings: A11yFinding[];
  /** Rendered HTML (for debugging) */
  html?: string;
  ranAt: string;
}

// ── Structural checks ──────────────────────────────────────────────────────

const AMBIGUOUS_LINK_TEXT = [
  "click here", "here", "read more", "more", "link", "this", "this link",
  "learn more", "details", "info", "continue",
];

function structuralChecks(doc: Document, markdown: string): A11yFinding[] {
  const findings: A11yFinding[] = [];
  const lines = markdown.split("\n");

  function guessLine(needle: string): number | undefined {
    const idx = lines.findIndex((l) => l.includes(needle));
    return idx >= 0 ? idx + 1 : undefined;
  }

  // 1. Images without alt text
  doc.querySelectorAll("img").forEach((img) => {
    const alt = img.getAttribute("alt");
    if (!alt || alt.trim() === "") {
      const src = img.getAttribute("src") ?? "";
      findings.push({
        ruleId: "image-alt",
        impact: "critical",
        description: "Image is missing alt text",
        html: img.outerHTML.slice(0, 120),
        line: guessLine(src),
        suggestion: `![Descriptive alt text](${src})`,
        fix: "Add descriptive alt text to the image. Describe what the image shows, not just its file name.",
        source: "structural",
      });
    }
  });

  // 2. Heading level skips
  const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6"));
  let prevLevel = 0;
  for (const h of headings) {
    const level = parseInt(h.tagName[1]);
    if (prevLevel > 0 && level > prevLevel + 1) {
      const text = h.textContent ?? "";
      findings.push({
        ruleId: "heading-order",
        impact: "moderate",
        description: `Heading level skips from h${prevLevel} to h${level}: "${text}"`,
        html: h.outerHTML,
        line: guessLine(text),
        suggestion: `${"#".repeat(prevLevel + 1)} ${text}`,
        fix: `Change to h${prevLevel + 1} (add one '#') to maintain heading hierarchy.`,
        source: "structural",
      });
    }
    prevLevel = level;
  }

  // 3. Ambiguous link text
  doc.querySelectorAll("a").forEach((a) => {
    const text = (a.textContent ?? "").trim().toLowerCase();
    if (AMBIGUOUS_LINK_TEXT.includes(text)) {
      const href = a.getAttribute("href") ?? "";
      findings.push({
        ruleId: "link-name",
        impact: "serious",
        description: `Link text "${text}" is ambiguous — not descriptive out of context`,
        html: a.outerHTML.slice(0, 120),
        line: guessLine(text),
        suggestion: `[Descriptive link text](${href})`,
        fix: 'Replace the link text with something that describes the destination, e.g. "View the quickstart guide".',
        source: "structural",
      });
    }
    // Links with no text at all
    if (!text && !a.querySelector("img")) {
      findings.push({
        ruleId: "link-name",
        impact: "critical",
        description: "Link has no accessible text",
        html: a.outerHTML.slice(0, 120),
        line: undefined,
        suggestion: `[Descriptive link text](${a.getAttribute("href") ?? "#"})`,
        fix: "Add descriptive text inside the <a> tag.",
        source: "structural",
      });
    }
  });

  // 4. Tables without header row
  doc.querySelectorAll("table").forEach((table) => {
    const hasHeader = table.querySelector("thead th") !== null;
    if (!hasHeader) {
      findings.push({
        ruleId: "table-header",
        impact: "serious",
        description: "Table has no header row (<th> elements)",
        html: table.outerHTML.slice(0, 200),
        line: undefined,
        suggestion: "Add a header row using `| Col1 | Col2 |` followed by `| --- | --- |` in Markdown.",
        fix: "Add a <thead> with <th> elements. In Markdown, ensure the table has a header separator row.",
        source: "structural",
      });
    }
  });

  // 5. Empty code blocks (no language hint) — informational
  const codeBlocks = markdown.match(/```\n/g) ?? [];
  if (codeBlocks.length > 0) {
    findings.push({
      ruleId: "code-lang",
      impact: "minor",
      description: `${codeBlocks.length} code block(s) missing language hint (e.g. \`\`\`python)`,
      html: "```\n...",
      line: undefined,
      suggestion: "Add a language hint after the opening backticks: ```python, ```javascript, etc.",
      fix: "Language hints improve syntax highlighting and help screen readers identify code type.",
      source: "structural",
    });
  }

  return findings;
}

// ── Axe checks ──────────────────────────────────────────────────────────────

async function runAxe(html: string): Promise<{
  violations: A11yFinding[];
  passes: number;
}> {
  // jsdom doesn't support all browser APIs axe needs; configure safely
  const dom = new JSDOM(
    `<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body>${html}</body></html>`,
    {
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
    }
  );

  const { window } = dom;

  // Polyfill missing browser APIs that axe needs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = window as any;
  if (!g.Node) g.Node = window.Node;
  if (!g.Element) g.Element = window.Element;
  if (!g.HTMLElement) g.HTMLElement = window.HTMLElement;

  // Run axe in the jsdom context
  return new Promise((resolve) => {
    // Inject axe source into jsdom
    try {
      const axeSource = axe.source;
      if (!axeSource) {
        resolve({ violations: [], passes: 0 });
        return;
      }

      dom.window.eval(axeSource);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const domAxe = (dom.window as any).axe;
      if (!domAxe) {
        resolve({ violations: [], passes: 0 });
        return;
      }

      domAxe.run(
        dom.window.document,
        {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "best-practice"],
          },
          // Skip rules that require a real browser
          rules: {
            "color-contrast": { enabled: false }, // needs computed styles
            "scrollable-region-focusable": { enabled: false },
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err: unknown, results: any) => {
          if (err || !results) {
            resolve({ violations: [], passes: 0 });
            return;
          }

          const violations: A11yFinding[] =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            results.violations.flatMap((v: any) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              v.nodes.map((n: any) => ({
                ruleId: v.id,
                impact: v.impact as A11ySeverity,
                description: v.description,
                helpUrl: v.helpUrl,
                html: (n.html as string).slice(0, 200),
                suggestion: `Fix: ${v.help}`,
                fix: v.help,
                source: "axe" as const,
              }))
            );

          resolve({ violations, passes: results.passes?.length ?? 0 });
        }
      );
    } catch {
      resolve({ violations: [], passes: 0 });
    }
  });
}

// ── Main entry ────────────────────────────────────────────────────────────

export async function checkAccessibility(
  markdown: string,
  opts?: { includeHtml?: boolean }
): Promise<A11yReport> {
  // Render Markdown → HTML
  const html = await marked.parse(markdown, { async: false }) as string;

  // Parse DOM
  const dom = new JSDOM(
    `<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body>${html}</body></html>`
  );
  const doc = dom.window.document;

  // Run checks in parallel
  const [axeResult, structFindings] = await Promise.all([
    runAxe(html),
    Promise.resolve(structuralChecks(doc, markdown)),
  ]);

  const allFindings = [...axeResult.violations, ...structFindings];

  return {
    violations: axeResult.violations.length,
    warnings: structFindings.length,
    passes: axeResult.passes,
    findings: allFindings,
    html: opts?.includeHtml ? html : undefined,
    ranAt: new Date().toISOString(),
  };
}
