import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Roadmap: GraphQL Schema Smoke Tests — DocsCI",
  description: "DocsCI will validate GraphQL query examples in your documentation against your live schema. Detects deprecated fields, type mismatches, and missing required arguments. ETA Q4 2025.",
  alternates: { canonical: "https://snippetci.com/roadmap/graphql-schema-smoke-tests" },
  openGraph: {
    title: "Roadmap: GraphQL Schema Smoke Tests — DocsCI",
    description: "Validate GraphQL query examples in docs against your live schema. Deprecated fields, type mismatches, missing args. Q4 2025.",
    url: "https://snippetci.com/roadmap/graphql-schema-smoke-tests",
    type: "article",
    siteName: "DocsCI",
  },
};

export default function GraphQLSmokeTestsRoadmap() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="roadmap-graphql">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm flex-wrap">
        <Link href="/" className="text-white font-bold">⚡ DocsCI</Link>
        <span className="text-gray-700">/</span>
        <Link href="/roadmap" className="text-gray-400 hover:text-white">Roadmap</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">GraphQL schema smoke tests</span>
      </nav>

      <article className="max-w-2xl mx-auto px-6 py-12" data-testid="roadmap-article">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="px-2 py-0.5 text-xs font-medium rounded border bg-blue-900 border-blue-700 text-blue-300">Planned</span>
          <span className="text-xs text-gray-500">ETA Q4 2025</span>
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-500">
            <span className="text-base">▲</span><span className="font-mono">89 votes</span>
          </span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4 leading-tight" data-testid="roadmap-h1">
          GraphQL Schema Smoke Tests
        </h1>
        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
          DocsCI will parse GraphQL query and mutation examples from your documentation,
          validate them against your live schema introspection, and detect deprecated field usage,
          type mismatches, and missing required arguments — filed as PR comments with suggested fixes.
        </p>

        <div className="space-y-8 text-sm text-gray-300 leading-relaxed">

          <section data-testid="section-problem">
            <h2 className="text-xl font-bold text-white mb-3">The GraphQL docs quality problem</h2>
            <p className="text-gray-400 mb-3">
              GraphQL schemas evolve constantly. Fields get deprecated, types change, arguments are renamed.
              Documentation query examples break in three silent ways:
            </p>
            <div className="space-y-3">
              {[
                {
                  type: "Deprecated field usage",
                  example: `# Schema: user.email is deprecated, use user.emailAddress
query GetUser {
  user(id: "123") {
    name
    email       # ← deprecated, docs example still uses it
  }
}`,
                  impact: "Users copy the example, get a deprecation warning, and file a support ticket.",
                },
                {
                  type: "Type mismatch in variables",
                  example: `# Schema: createPost(authorId: ID!) — not String
mutation CreatePost($title: String!, $authorId: String!) {
  createPost(title: $title, authorId: $authorId) { id }
}
# ↑ authorId should be ID!, not String!`,
                  impact: "Query fails at runtime with a cryptic type error.",
                },
                {
                  type: "Missing required arguments",
                  example: `# Schema: post(id: ID!, locale: String!) — locale is required
query GetPost($id: ID!) {
  post(id: $id) {        # ← missing required locale argument
    title
    content
  }
}`,
                  impact: "Query returns a 400 or null — confusing to developers new to the API.",
                },
              ].map(item => (
                <div key={item.type} className="border border-gray-700 rounded-xl overflow-hidden">
                  <div className="bg-gray-900 px-4 py-2 flex items-center gap-2">
                    <span className="text-red-400 text-xs font-semibold">⚠ {item.type}</span>
                  </div>
                  <pre className="px-4 py-3 text-xs text-green-300 overflow-x-auto bg-gray-950">{item.example}</pre>
                  <div className="px-4 py-2 bg-gray-900 border-t border-gray-800 text-xs text-gray-400">{item.impact}</div>
                </div>
              ))}
            </div>
          </section>

          <section data-testid="section-how">
            <h2 className="text-xl font-bold text-white mb-3">How GraphQL smoke tests will work</h2>
            <div className="space-y-3">
              {[
                {
                  step: "1",
                  title: "Schema introspection",
                  desc: "DocsCI fetches your GraphQL schema via introspection query (`__schema`) against your staging endpoint. Supports standard introspection, schema file upload, or SDL file in the repo.",
                },
                {
                  step: "2",
                  title: "Query extraction from docs",
                  desc: "GraphQL fenced code blocks (`graphql`, `gql`) are extracted from Markdown/MDX files. Variables blocks are extracted from adjacent json/javascript code blocks or inline comments.",
                },
                {
                  step: "3",
                  title: "Static validation",
                  desc: "Extracted queries are validated against the schema using graphql-js validate(). Checks: deprecated fields, type compatibility, required arguments, unknown fields, and fragment consistency.",
                },
                {
                  step: "4",
                  title: "Optional: live smoke test",
                  desc: "With `graphql.smoke_test: true`, DocsCI executes the query against your staging endpoint (allowlisted). Validates that the response matches the documented shape.",
                },
                {
                  step: "5",
                  title: "PR comments with fixes",
                  desc: "Each finding is filed as a PR comment with the exact file/line, the validation error, and a suggested fix. Deprecated field findings include the replacement field name from the schema's @deprecated reason.",
                },
              ].map(s => (
                <div key={s.step} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-700 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{s.step}</span>
                  <div>
                    <div className="text-white font-medium text-sm">{s.title}</div>
                    <p className="text-gray-400 text-xs mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section data-testid="section-config">
            <h2 className="text-xl font-bold text-white mb-3">Planned configuration</h2>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`# docsci.yml (planned GraphQL config)
graphql:
  # Schema source (one of):
  schema_url: "https://staging-api.example.com/graphql"  # introspection
  # schema_file: "schema.graphql"                         # SDL file in repo

  # Introspection auth (if needed)
  schema_auth:
    type: bearer
    token_env: GRAPHQL_SCHEMA_TOKEN

  # Validation rules
  check_deprecated: true          # fail on deprecated field usage
  check_types: true               # validate variable types
  check_required_args: true       # flag missing required arguments
  fail_on_deprecated: false       # warn only, don't fail CI
  fail_on_type_error: true        # type errors block merge

  # Optional: live smoke test
  smoke_test: false               # set true to execute queries against staging
  smoke_test_url: "https://staging-api.example.com/graphql"
  smoke_test_auth:
    type: bearer
    token_env: GRAPHQL_API_TOKEN`}</pre>
          </section>

          <section data-testid="section-pr-comment">
            <h2 className="text-xl font-bold text-white mb-3">Sample PR comment output</h2>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`## ⚠️ DocsCI — GraphQL — docs/reference/users.md:34

**Finding:** Deprecated field \`user.email\` — use \`user.emailAddress\` instead.
**Rule:** check_deprecated
**Impact:** warning

\`\`\`diff
  query GetUser($id: ID!) {
    user(id: $id) {
      name
-     email
+     emailAddress
    }
  }
\`\`\`

---

## ❌ DocsCI — GraphQL — docs/guides/create-post.md:89

**Finding:** Variable \`$authorId\` has type \`String!\` but schema expects \`ID!\`
**Rule:** check_types
**Impact:** critical — blocks merge

\`\`\`diff
- mutation CreatePost($title: String!, $authorId: String!) {
+ mutation CreatePost($title: String!, $authorId: ID!) {
\`\`\``}</pre>
          </section>

          <section data-testid="section-timeline">
            <h2 className="text-xl font-bold text-white mb-3">Timeline</h2>
            <div className="space-y-2">
              {[
                { date: "Now", label: "REST/curl example execution available", done: true },
                { date: "Oct 2025", label: "Private beta: GraphQL static validation (schema file)", done: false },
                { date: "Nov 2025", label: "Schema introspection support", done: false },
                { date: "Dec 2025", label: "GA: GraphQL smoke tests on all plans", done: false },
                { date: "Q1 2026", label: "Live smoke test execution (optional)", done: false },
              ].map(row => (
                <div key={row.date} className="flex items-start gap-3">
                  <span className={`text-xs font-mono w-20 shrink-0 pt-0.5 ${row.done ? "text-green-400" : "text-gray-500"}`}>{row.date}</span>
                  <span className={`text-sm ${row.done ? "text-white" : "text-gray-400"}`}>{row.label}</span>
                  {row.done && <span className="text-green-400 text-xs ml-auto">✓</span>}
                </div>
              ))}
            </div>
          </section>

          <div className="p-5 bg-indigo-950 border border-indigo-700 rounded-2xl">
            <h3 className="text-white font-semibold mb-2">Using GraphQL? Tell us about your schema.</h3>
            <p className="text-indigo-200 text-sm mb-4">
              We&apos;re looking for GraphQL teams to co-design the smoke test feature. Share your use case and join the Q4 beta.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:hello@snippetci.com?subject=GraphQL%20Smoke%20Tests%20Beta"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Join GraphQL beta →
              </a>
              <Link href="/signup" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-lg border border-gray-600 transition-colors">
                Sign up (REST/OpenAPI available now) →
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
