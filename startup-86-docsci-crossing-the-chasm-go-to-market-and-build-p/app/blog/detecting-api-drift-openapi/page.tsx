import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Detecting API Drift from OpenAPI and Documentation — DocsCI Blog",
  description: "A technical deep-dive into how DocsCI diffs your OpenAPI spec against your documentation to detect parameter drift, schema mismatches, and deprecated endpoints before they reach your users.",
  alternates: { canonical: "https://snippetci.com/blog/detecting-api-drift-openapi" },
  openGraph: {
    title: "Detecting API Drift from OpenAPI + Docs",
    description: "How to diff OpenAPI specs against documentation to catch parameter drift before your users do.",
    url: "https://snippetci.com/blog/detecting-api-drift-openapi",
    type: "article",
    siteName: "DocsCI",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Detecting API Drift from OpenAPI and Documentation",
  "datePublished": "2025-06-25",
  "dateModified": "2025-06-25",
  "author": { "@type": "Organization", "name": "DocsCI", "url": "https://snippetci.com" },
  "publisher": { "@type": "Organization", "name": "DocsCI", "url": "https://snippetci.com" },
  "url": "https://snippetci.com/blog/detecting-api-drift-openapi",
};

export default function DetectingApiDriftOpenAPIPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="blog-post-openapi-drift">
        <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm flex-wrap">
          <Link href="/" className="text-white font-bold">⚡ DocsCI</Link>
          <span className="text-gray-700">/</span>
          <Link href="/blog" className="text-gray-400 hover:text-white">Blog</Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-300">Detecting API drift from OpenAPI</span>
        </nav>

        <article className="max-w-2xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
            <time dateTime="2025-06-25">June 25, 2025</time>
            <span>·</span>
            <span>13 min read</span>
            {["OpenAPI", "drift detection", "architecture"].map(t => (
              <span key={t} className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">{t}</span>
            ))}
          </div>

          <h1 className="text-3xl font-bold text-white mb-4 leading-tight" data-testid="post-h1">
            Detecting API Drift from OpenAPI + Docs
          </h1>
          <p className="text-gray-400 text-lg mb-8 leading-relaxed">
            A technical deep-dive into how DocsCI diffs your OpenAPI specification against your documentation
            to detect parameter drift, schema mismatches, and deprecated endpoints — before they reach your users.
          </p>

          <div className="prose prose-invert max-w-none text-gray-300 space-y-6 text-sm leading-relaxed">

            <h2 className="text-xl font-bold text-white">The core problem: two sources of truth</h2>
            <p>
              Every API-first company eventually ends up with two sources of truth: the OpenAPI spec (or equivalent
              schema file) that the backend team maintains, and the developer documentation that the docs team
              writes and publishes. These two documents are supposed to describe the same thing, but they diverge
              constantly because they're maintained by different people with different tools and different priorities.
            </p>
            <p>
              When your OpenAPI spec says a parameter is required and your docs say it's optional,
              one of them is wrong. DocsCI's job is to find which one and tell you about it before a developer
              spends 45 minutes debugging a 422.
            </p>

            <h2 className="text-xl font-bold text-white">Step 1: Parsing the OpenAPI spec</h2>
            <p>
              DocsCI accepts OpenAPI specs in JSON or YAML, versions 2.x (Swagger) and 3.x.
              We parse the spec into a normalized internal representation — an endpoint registry where each
              entry describes the contract for one operation:
            </p>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`// Normalized endpoint contract (internal representation)
type EndpointContract = {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;           // "/users/{id}"
  pathParams: Param[];
  queryParams: Param[];
  requestBody?: {
    required: boolean;
    schema: JSONSchema;
    requiredFields: string[];
  };
  responses: Record<string, ResponseContract>;
  deprecated: boolean;
  tags: string[];
};

type Param = {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  schema: JSONSchema;
  description?: string;
};

// Example: POST /users from OpenAPI
const contract: EndpointContract = {
  method: "POST",
  path: "/users",
  pathParams: [],
  queryParams: [],
  requestBody: {
    required: true,
    schema: { type: "object" },
    requiredFields: ["email", "plan"],  // ← plan is required
  },
  responses: {
    "201": { description: "User created" },
    "422": { description: "Validation error" },
  },
  deprecated: false,
  tags: ["users"],
};`}</pre>

            <h2 className="text-xl font-bold text-white">Step 2: Extracting claims from documentation</h2>
            <p>
              Extracting what the documentation <em>claims</em> about an API is harder than parsing a spec.
              Docs are written in natural language, with code examples, tables, and prose.
              We use three extraction strategies in combination:
            </p>
            <div className="space-y-3">
              {[
                {
                  name: "Code example parsing",
                  desc: "curl, fetch, and SDK examples are parsed to extract the HTTP method, path, request body fields, and headers. A curl example like `curl -X POST /users -d '{\"email\":\"...\"}' tells us the docs claim email is a valid field for POST /users.",
                  example: `# Extracted from this curl example:
curl -X POST https://api.example.com/users \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com"}'

# Claims extracted:
# - endpoint: POST /users
# - request body field: email (string)
# - required fields: email (only field shown)
# - no mention of: plan`,
                },
                {
                  name: "Parameter table extraction",
                  desc: "Many API docs have a parameters table with columns like 'Name', 'Type', 'Required', 'Description'. We parse these tables and extract structured claims about each parameter's type and required status.",
                  example: `| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| email     | string | Yes      | User email      |
| plan      | string | No       | Subscription    |
# ↑ Docs claim: plan is optional
# OpenAPI says: plan is required → DRIFT FINDING`,
                },
                {
                  name: "Prose extraction (AI-assisted)",
                  desc: "For descriptions like 'The plan field is required when creating a user', we use a lightweight NLP model to extract claims. This catches drift in prose that doesn't appear in tables or code examples.",
                  example: null,
                },
              ].map(s => (
                <div key={s.name} className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
                  <h3 className="text-white font-medium text-sm mb-1">{s.name}</h3>
                  <p className="text-gray-400 text-xs mb-2">{s.desc}</p>
                  {s.example && <pre className="text-xs text-green-300 overflow-x-auto">{s.example}</pre>}
                </div>
              ))}
            </div>

            <h2 className="text-xl font-bold text-white">Step 3: The diff algorithm</h2>
            <p>
              Once we have a normalized spec contract and a normalized set of documentation claims,
              we run a structured diff. The diff rules, in order of severity:
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-900">
                    <th className="text-left text-gray-400 py-2 px-3">Drift type</th>
                    <th className="text-left text-gray-400 py-2 px-3">Example</th>
                    <th className="text-left text-gray-400 py-2 px-3">Severity</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {[
                    ["Required param not in docs", "OpenAPI: plan required. Docs: no mention of plan", "critical"],
                    ["Optional in docs, required in spec", "Docs: plan is optional. Spec: plan is required", "critical"],
                    ["Wrong type in docs", "Docs: user_id is string. Spec: user_id is integer", "critical"],
                    ["Deprecated endpoint documented as current", "Spec: GET /v1/users deprecated=true. Docs: no deprecation notice", "warning"],
                    ["Response field not documented", "Spec returns 'created_at'. Docs don't mention created_at", "info"],
                    ["Extra field in docs not in spec", "Docs show field 'metadata'. Spec doesn't define it", "warning"],
                  ].map(([type, example, sev]) => (
                    <tr key={type} className="border-b border-gray-800">
                      <td className="py-2 px-3 font-medium">{type}</td>
                      <td className="py-2 px-3 text-gray-400">{example}</td>
                      <td className={`py-2 px-3 font-medium ${sev === "critical" ? "text-red-400" : sev === "warning" ? "text-yellow-400" : "text-blue-400"}`}>{sev}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="text-xl font-bold text-white">Step 4: PR comments with AI-generated fixes</h2>
            <p>
              For each drift finding, DocsCI generates a precise GitHub PR comment pointing to the
              exact file and line where the documentation makes the incorrect claim.
              The comment includes the finding, the OpenAPI source, and an AI-generated suggested fix:
            </p>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`## ⚠️ DocsCI: API Drift — docs/api/users.md:47

**Finding:** POST /users — parameter \`plan\` is documented as optional but 
is required in the OpenAPI spec (v2.3.1).

**OpenAPI source:** components/schemas/CreateUserRequest/required[1]

**Suggested fix:**
\`\`\`diff
- | plan | string | No  | Subscription plan |
+ | plan | string | Yes | Subscription plan (required) |
\`\`\`

Or in prose:
\`\`\`diff
-  The \`plan\` field is optional.
+  The \`plan\` field is required. Valid values: \`free\`, \`pro\`, \`enterprise\`.
\`\`\``}</pre>

            <h2 className="text-xl font-bold text-white">Integrating with your CI pipeline</h2>
            <p>
              Add your OpenAPI spec URL to the DocsCI GitHub Action and drift detection runs automatically on every PR:
            </p>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`- name: Run DocsCI with drift detection
  run: |
    tar czf docs.tar.gz docs/ *.md
    curl -sf -X POST https://snippetci.com/api/runs/queue \\
      -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
      -F "docs_archive=@docs.tar.gz" \\
      -F "openapi_url=https://staging-api.example.com/openapi.json" \\
    | jq -e '.status == "passed"'

# Drift findings appear as inline PR comments
# Critical findings fail the CI check
# Warnings are reported but don't block merge`}</pre>

            <div className="p-5 bg-indigo-950 border border-indigo-700 rounded-xl mt-8">
              <h3 className="text-white font-semibold mb-2">Detect drift in your docs today</h3>
              <p className="text-indigo-200 text-sm mb-4">
                Connect your OpenAPI spec and get a full drift report in 5 minutes. Free tier available.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/signup" className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition-colors">
                  Get started free →
                </Link>
                <Link href="/blog/api-drift-detection" className="inline-block px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg text-sm transition-colors border border-gray-600">
                  Drift detection overview
                </Link>
              </div>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
