/**
 * POST /api/drift-detect
 *
 * SDK/API drift detection: compare OpenAPI spec against doc examples.
 *
 * Request body:
 *   openapi_text: string        — Raw OpenAPI YAML or JSON
 *   docs: DocFile[]             — Array of { path, content, codeFences[] }
 *
 * Response (200): DriftReport
 * Response (400): { error: string }
 *
 * GET /api/drift-detect: returns usage docs + runs on sample data
 */
import { NextRequest, NextResponse } from "next/server";
import { runDriftDetection, detectDrift, extractOperations, type DocFile } from "@/lib/drift-detect";
import { readFileSync } from "fs";
import { join } from "path";
import * as yaml from "js-yaml";

export const dynamic = "force-dynamic";

// Load sample fixture for GET demo
function loadSampleFixture(): { spec: Record<string, unknown>; docs: DocFile[] } | null {
  try {
    const basePath = join(process.cwd(), "lib/fixtures/sample-repo");

    const specText = readFileSync(join(basePath, "openapi.yaml"), "utf8");
    const spec = yaml.load(specText) as Record<string, unknown>;

    const gettingStarted = readFileSync(
      join(basePath, "docs/getting-started.md"),
      "utf8"
    );
    const webhooks = readFileSync(join(basePath, "docs/webhooks.md"), "utf8");

    // Simple code fence parser
    const parseFences = (content: string) => {
      const fences: { language: string; code: string; startLine?: number }[] = [];
      const lines = content.split("\n");
      let inFence = false;
      let lang = "";
      let fenceLines: string[] = [];
      let startLine = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!inFence && /^```(\w*)/.test(line)) {
          inFence = true;
          lang = line.match(/^```(\w*)/)?.[1] ?? "";
          fenceLines = [];
          startLine = i + 1;
        } else if (inFence && /^```\s*$/.test(line)) {
          fences.push({ language: lang, code: fenceLines.join("\n"), startLine });
          inFence = false;
          lang = "";
          fenceLines = [];
        } else if (inFence) {
          fenceLines.push(line);
        }
      }
      return fences;
    }

    return {
      spec,
      docs: [
        {
          path: "docs/getting-started.md",
          content: gettingStarted,
          codeFences: parseFences(gettingStarted),
        },
        {
          path: "docs/webhooks.md",
          content: webhooks,
          codeFences: parseFences(webhooks),
        },
      ],
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const sample = loadSampleFixture();
  const sampleReport = sample ? detectDrift(sample.spec, sample.docs) : null;

  return NextResponse.json({
    endpoint: "POST /api/drift-detect",
    description:
      "Detect SDK/API drift between OpenAPI spec and doc code examples",
    drift_types: [
      "endpoint_not_in_spec — example references endpoint not in OpenAPI",
      "wrong_method — example uses GET but spec says POST, etc.",
      "sdk_method_removed — client.foo() has no matching operationId",
      "required_param_missing — example omits required request body fields",
      "missing_example — spec endpoint has no doc coverage",
      "deprecated_pattern — example uses deprecated endpoint/method",
    ],
    request: {
      openapi_text: "string — Raw OpenAPI YAML or JSON",
      docs: "DocFile[] — [{ path, content, codeFences: [{language, code}] }]",
    },
    sample_run: sampleReport
      ? {
          specTitle: sampleReport.specTitle,
          specVersion: sampleReport.specVersion,
          docsAnalyzed: sampleReport.docsAnalyzed,
          fencesAnalyzed: sampleReport.fencesAnalyzed,
          findingCount: sampleReport.findings.length,
          findingsByType: sampleReport.findings.reduce(
            (acc: Record<string, number>, f) => {
              acc[f.type] = (acc[f.type] ?? 0) + 1;
              return acc;
            },
            {}
          ),
          coveragePercent: sampleReport.endpointCoverage.total
            ? Math.round(
                (sampleReport.endpointCoverage.covered /
                  sampleReport.endpointCoverage.total) *
                  100
              )
            : 0,
          topFindings: sampleReport.findings
            .filter((f) => f.severity !== "info")
            .slice(0, 5)
            .map((f) => ({
              type: f.type,
              severity: f.severity,
              file: f.file,
              message: f.message,
            })),
        }
      : null,
  });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { openapi_text, docs } = body as {
    openapi_text?: string;
    docs?: DocFile[];
  };

  if (!openapi_text) {
    return NextResponse.json(
      { error: "openapi_text is required" },
      { status: 400 }
    );
  }

  if (!docs || !Array.isArray(docs) || docs.length === 0) {
    return NextResponse.json(
      { error: "docs array is required (at least one DocFile)" },
      { status: 400 }
    );
  }

  // Validate doc structure
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    if (!doc.path || !doc.codeFences || !Array.isArray(doc.codeFences)) {
      return NextResponse.json(
        { error: `docs[${i}] must have path and codeFences fields` },
        { status: 400 }
      );
    }
  }

  try {
    const report = await runDriftDetection(openapi_text, docs);
    return NextResponse.json(report, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
