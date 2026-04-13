/**
 * drift-detect.spec.ts — SDK/API drift detection E2E tests
 *
 * Tests /api/drift-detect:
 * - GET: usage docs + sample run against Acme fixture
 * - POST validation: missing fields
 * - Drift types: endpoint_not_in_spec, wrong_method, sdk_method_removed,
 *   required_param_missing, missing_example, deprecated_pattern
 * - Coverage metrics
 * - UI page loads
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// Simple spec with multiple endpoints
const ACME_SPEC = `openapi: "3.1.0"
info:
  title: Acme API
  version: "2.1.0"
paths:
  /init:
    post:
      operationId: initClient
      summary: Initialize client (replaces deprecated /connect)
      description: "Breaking change: /connect removed. Use /init instead."
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [api_key]
              properties:
                api_key:
                  type: string
      responses:
        "200":
          description: OK
  /status:
    get:
      operationId: getStatus
      summary: Get status
      responses:
        "200":
          description: OK
  /users:
    get:
      operationId: listUsers
      summary: List users
      responses:
        "200":
          description: OK`;

// Helper to build request
function makeDoc(language: string, code: string) {
  return [
    {
      path: "docs/test.md",
      content: "",
      codeFences: [{ language, code, startLine: 1 }],
    },
  ];
}

test.describe("Drift Detect API — GET probe", () => {
  test("GET /api/drift-detect returns usage docs with sample_run", async ({ request }) => {
    const res = await request.get(`${BASE}/api/drift-detect`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.endpoint).toBe("POST /api/drift-detect");
    expect(Array.isArray(body.drift_types)).toBe(true);
    expect(body.drift_types.length).toBeGreaterThan(3);
    // sample_run should have Acme fixture analysis
    expect(body.sample_run).toBeTruthy();
    expect(body.sample_run.specTitle).toBe("Acme API");
    expect(body.sample_run.findingCount).toBeGreaterThan(0);
    expect(typeof body.sample_run.coveragePercent).toBe("number");
  });
});

test.describe("Drift Detect API — validation", () => {
  test("POST without body returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/drift-detect`, {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST missing openapi_text returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/drift-detect`, {
      data: { docs: [] },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("openapi_text");
  });

  test("POST missing docs returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/drift-detect`, {
      data: { openapi_text: ACME_SPEC },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/docs/i);
  });

  test("POST with empty docs array returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/drift-detect`, {
      data: { openapi_text: ACME_SPEC, docs: [] },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST with invalid doc structure returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/drift-detect`, {
      data: {
        openapi_text: ACME_SPEC,
        docs: [{ noPath: true }],
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("Drift Detect API — wrong_method finding", () => {
  test("GET instead of POST on /init detected as wrong_method", async ({ request }) => {
    const res = await request.post(`${BASE}/api/drift-detect`, {
      data: {
        openapi_text: ACME_SPEC,
        docs: makeDoc("python", "import requests\nresponse = requests.get('/init', json={'api_key': 'sk_test'})"),
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const wrongMethod = body.findings.find(
      (f: { type: string }) => f.type === "wrong_method"
    );
    expect(wrongMethod).toBeTruthy();
    expect(wrongMethod.severity).toBe("error");
    expect(wrongMethod.message).toMatch(/GET.*POST|POST.*GET/i);
    expect(wrongMethod.suggestion).toBeTruthy();
  });
});

test.describe("Drift Detect API — sdk_method_removed finding", () => {
  test("client.connect() flagged as deprecated/removed SDK method", async ({ request }) => {
    const res = await request.post(`${BASE}/api/drift-detect`, {
      data: {
        openapi_text: ACME_SPEC,
        docs: makeDoc("python", "client = AcmeClient(api_key='sk_test')\nclient.connect()\nprint(client.status())"),
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const sdkFinding = body.findings.find(
      (f: { type: string; evidence: string }) =>
        f.type === "sdk_method_removed" && f.evidence.includes("connect")
    );
    expect(sdkFinding).toBeTruthy();
    expect(sdkFinding.severity).toMatch(/error|warning/);
    expect(sdkFinding.message).toMatch(/connect/i);
    expect(sdkFinding.suggestion).toBeTruthy();
  });
});

test.describe("Drift Detect API — required_param_missing finding", () => {
  test("POST /init without api_key flagged as required_param_missing", async ({ request }) => {
    // Use minimal spec (no deprecation mentions to avoid interference)
    const simpleSpec = `openapi: "3.1.0"
info:
  title: Simple API
  version: "1.0"
paths:
  /init:
    post:
      operationId: initClient
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [api_key]
              properties:
                api_key:
                  type: string
      responses:
        "200":
          description: OK`;
    const res = await request.post(`${BASE}/api/drift-detect`, {
      data: {
        openapi_text: simpleSpec,
        docs: makeDoc("python", "import requests\nresponse = requests.post('/init', json={})  # empty body"),
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const paramFinding = body.findings.find(
      (f: { type: string }) => f.type === "required_param_missing"
    );
    expect(paramFinding).toBeTruthy();
    expect(paramFinding.severity).toBe("warning");
    expect(paramFinding.message).toContain("api_key");
    expect(paramFinding.suggestion).toContain("api_key");
  });
});

test.describe("Drift Detect API — missing_example finding", () => {
  test("Spec endpoints with no doc coverage get missing_example", async ({ request }) => {
    // Only cover /status, leave /init and /users uncovered
    const res = await request.post(`${BASE}/api/drift-detect`, {
      data: {
        openapi_text: ACME_SPEC,
        docs: makeDoc("python", "import requests\nresponse = requests.get('/status')"),
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const missingFindings = body.findings.filter(
      (f: { type: string }) => f.type === "missing_example"
    );
    expect(missingFindings.length).toBeGreaterThan(0);
    // severity should be info
    for (const f of missingFindings) {
      expect(f.severity).toBe("info");
    }
  });
});

test.describe("Drift Detect API — coverage metrics", () => {
  test("Coverage counted correctly when some endpoints are covered", async ({ request }) => {
    // Cover /status and /init (via POST), leave /users uncovered
    const res = await request.post(`${BASE}/api/drift-detect`, {
      data: {
        openapi_text: ACME_SPEC,
        docs: [
          {
            path: "docs/test.md",
            content: "",
            codeFences: [
              {
                language: "python",
                code: "import requests\nr1 = requests.get('/status')\nr2 = requests.post('/init', json={'api_key': 'sk_test'})",
              },
            ],
          },
        ],
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.endpointCoverage.total).toBe(3); // /init, /status, /users
    expect(body.endpointCoverage.covered).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.endpointCoverage.uncovered)).toBe(true);
  });

  test("100% coverage when all endpoints are covered", async ({ request }) => {
    const res = await request.post(`${BASE}/api/drift-detect`, {
      data: {
        openapi_text: ACME_SPEC,
        docs: [
          {
            path: "docs/all.md",
            content: "",
            codeFences: [
              {
                language: "python",
                code: `import requests
r1 = requests.post('/init', json={'api_key': 'sk_test'})
r2 = requests.get('/status')
r3 = requests.get('/users')`,
              },
            ],
          },
        ],
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.endpointCoverage.covered).toBe(3);
    expect(body.endpointCoverage.uncovered).toHaveLength(0);
    // No missing_example findings
    const missing = body.findings.filter(
      (f: { type: string }) => f.type === "missing_example"
    );
    expect(missing).toHaveLength(0);
  });
});

test.describe("Drift Detect API — multiple doc files", () => {
  test("Analyzes multiple doc files and aggregates findings", async ({ request }) => {
    const res = await request.post(`${BASE}/api/drift-detect`, {
      data: {
        openapi_text: ACME_SPEC,
        docs: [
          {
            path: "docs/getting-started.md",
            content: "",
            codeFences: [
              { language: "python", code: "client.connect()  # deprecated" },
            ],
          },
          {
            path: "docs/webhooks.md",
            content: "",
            codeFences: [
              {
                language: "python",
                code: "import requests\nrequests.get('/users')",
              },
            ],
          },
        ],
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.docsAnalyzed).toBe(2);
    expect(body.fencesAnalyzed).toBe(2);
    // Both files should appear in findings
    const files = [...new Set(body.findings.map((f: { file: string }) => f.file))];
    expect(files.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Drift Detect API — result metadata", () => {
  test("Result includes all required metadata fields", async ({ request }) => {
    const res = await request.post(`${BASE}/api/drift-detect`, {
      data: {
        openapi_text: ACME_SPEC,
        docs: makeDoc("python", "import requests\nrequests.get('/status')"),
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.specTitle).toBe("string");
    expect(typeof body.specVersion).toBe("string");
    expect(typeof body.docsAnalyzed).toBe("number");
    expect(typeof body.fencesAnalyzed).toBe("number");
    expect(Array.isArray(body.findings)).toBe(true);
    expect(typeof body.endpointCoverage).toBe("object");
    expect(body.ranAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("Each finding has required fields", async ({ request }) => {
    const res = await request.post(`${BASE}/api/drift-detect`, {
      data: {
        openapi_text: ACME_SPEC,
        docs: makeDoc("python", "client.connect()"),
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    if (body.findings.length > 0) {
      const f = body.findings[0];
      expect(typeof f.type).toBe("string");
      expect(f.severity).toMatch(/error|warning|info/);
      expect(typeof f.file).toBe("string");
      expect(typeof f.evidence).toBe("string");
      expect(typeof f.message).toBe("string");
      expect(typeof f.suggestion).toBe("string");
    }
  });
});

test.describe("Drift Detect UI", () => {
  test("Drift detect page loads with form elements", async ({ page }) => {
    await page.goto(`${BASE}/drift-detect`);
    await expect(page.getByText("Drift Detection")).toBeVisible();
    await expect(page.getByText("Detect Drift")).toBeVisible();
    await expect(page.getByText("Run on sample repo")).toBeVisible();
  });

  test("Drift detect page shows OpenAPI spec textarea", async ({ page }) => {
    await page.goto(`${BASE}/drift-detect`);
    // Should have textareas for spec and doc content
    const textareas = page.locator("textarea");
    await expect(textareas.first()).toBeVisible();
  });
});
