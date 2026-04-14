import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hermetic Snippet Execution for Documentation — DocsCI Blog",
  description: "How DocsCI runs documentation code examples in hermetic, isolated sandboxes — V8 isolates for JavaScript/TypeScript, Pyodide WebAssembly for Python, and ephemeral network allowlists for curl examples.",
  alternates: { canonical: "https://snippetci.com/blog/hermetic-snippet-execution" },
  openGraph: {
    title: "Hermetic Snippet Execution for Documentation",
    description: "V8 isolates, Pyodide WASM, and network allowlists: how DocsCI executes docs examples safely at scale.",
    url: "https://snippetci.com/blog/hermetic-snippet-execution",
    type: "article",
    siteName: "DocsCI",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Hermetic Snippet Execution for Documentation",
  "datePublished": "2025-06-20",
  "dateModified": "2025-06-20",
  "author": { "@type": "Organization", "name": "DocsCI", "url": "https://snippetci.com" },
  "publisher": { "@type": "Organization", "name": "DocsCI", "url": "https://snippetci.com" },
  "url": "https://snippetci.com/blog/hermetic-snippet-execution",
  "description": "How DocsCI runs documentation code examples in hermetic, isolated sandboxes.",
};

export default function HermeticSnippetExecutionPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="blog-post-hermetic">
        <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm flex-wrap">
          <Link href="/" className="text-white font-bold">⚡ DocsCI</Link>
          <span className="text-gray-700">/</span>
          <Link href="/blog" className="text-gray-400 hover:text-white">Blog</Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-300">Hermetic snippet execution</span>
        </nav>

        <article className="max-w-2xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
            <time dateTime="2025-06-20">June 20, 2025</time>
            <span>·</span>
            <span>14 min read</span>
            {["sandbox", "security", "architecture"].map(t => (
              <span key={t} className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">{t}</span>
            ))}
          </div>

          <h1 className="text-3xl font-bold text-white mb-4 leading-tight" data-testid="post-h1">
            Hermetic Snippet Execution for Documentation
          </h1>
          <p className="text-gray-400 text-lg mb-8 leading-relaxed">
            How DocsCI runs documentation code examples safely at scale — V8 isolates for JavaScript/TypeScript,
            Pyodide WebAssembly for Python, and ephemeral network allowlists for curl examples.
            No shared state. No host contamination. No credential leaks.
          </p>

          <div className="prose prose-invert max-w-none text-gray-300 space-y-6 text-sm leading-relaxed">

            <h2 className="text-xl font-bold text-white">Why hermetic execution matters for docs</h2>
            <p>
              Running untrusted code from documentation is a different problem than running your own test suite.
              A docs snippet might import a library you don't have installed. It might contain an API key.
              It might make network requests to a live production endpoint. It might fork a process or write to disk.
              It might simply be broken — which is the whole point of running it.
            </p>
            <p>
              The naive approach — running snippets in a Docker container with the right language installed — works
              until it doesn't. Shared state between runs causes flaky results. Network access to arbitrary hosts is
              a security problem. Long-running snippets block the queue. A single <code className="bg-gray-800 px-1 rounded">import os; os.system('rm -rf /')</code> (hypothetically)
              could be catastrophic.
            </p>
            <p>
              We built DocsCI's execution layer from first principles around three requirements:
            </p>
            <ol className="space-y-2 list-decimal list-inside">
              <li><strong className="text-white">Isolation:</strong> each snippet gets its own fresh environment with zero shared state from prior runs</li>
              <li><strong className="text-white">Safety:</strong> credential scanning before execution; network allowlists enforced at the syscall level</li>
              <li><strong className="text-white">Fidelity:</strong> execution results must reflect what the developer would see on their machine</li>
            </ol>

            <h2 className="text-xl font-bold text-white">JavaScript and TypeScript: V8 isolates</h2>
            <p>
              For JavaScript and TypeScript, we use V8 isolates — the same isolation primitive that powers
              Cloudflare Workers and Deno Deploy. Each isolate is a fully independent V8 heap with no shared
              memory, no shared globals, and no access to Node.js APIs unless explicitly injected.
            </p>
            <p>
              The execution flow for a JavaScript snippet looks like this:
            </p>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`// Simplified execution pipeline (JavaScript)

// 1. Parse snippet — extract from Markdown fence block
const snippet = extractSnippet(markdownBlock);

// 2. Pre-execution security scan
const scanResult = await scanForSecrets(snippet);
if (scanResult.findings.length > 0) {
  return { status: "skipped", reason: "credentials_detected", findings: scanResult.findings };
}

// 3. Create fresh V8 isolate
const isolate = new ivm.Isolate({ memoryLimit: 64 }); // 64MB limit
const context = await isolate.createContext();

// 4. Inject allowed globals (console, fetch with allowlist)
await context.global.set("console", safeConsole);
await context.global.set("fetch", allowlistFetch(config.networkAllowlist));

// 5. Compile and run with timeout
const script = await isolate.compileScript(snippet, { filename: "snippet.js" });
const result = await script.run(context, { timeout: 20_000 }); // 20s timeout

// 6. Collect output and dispose
const output = capturedOutput.join("\\n");
isolate.dispose();
return { status: "passed", output, duration_ms: Date.now() - start };`}</pre>
            <p>
              The key constraint: <strong className="text-white">each isolate is disposed after execution</strong>.
              There's no persistent state between snippets. A snippet that sets a global variable on run N
              will not see that variable on run N+1. This is what makes results reproducible.
            </p>

            <h2 className="text-xl font-bold text-white">Python: Pyodide in WebAssembly</h2>
            <p>
              Python is harder than JavaScript. Python's standard execution model involves a native interpreter,
              filesystem access, subprocess spawning, and a C extension ecosystem that doesn't sandbox cleanly.
            </p>
            <p>
              We use <strong className="text-white">Pyodide</strong> — CPython compiled to WebAssembly via Emscripten.
              Pyodide runs inside a V8 isolate, which means it inherits all the isolation properties described above,
              plus the WASM security model: no direct filesystem access, no subprocess spawning, no native syscalls.
            </p>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`// Python execution via Pyodide WASM
const pyodide = await loadPyodide({ indexURL: PYODIDE_CDN });

// Install required packages (from pip annotations in snippet comments)
// # pip: requests,numpy
const packages = extractPipAnnotations(snippet);
if (packages.length > 0) {
  await pyodide.loadPackagesFromImports(snippet); // load from stdlib
  // micropip for PyPI packages (allowlisted)
  await pyodide.runPythonAsync(\`
    import micropip
    await micropip.install([\${packages.map(p => \`"\${p}"\`).join(",")}])
  \`);
}

// Redirect stdout/stderr
pyodide.runPython(\`
  import sys, io
  sys.stdout = io.StringIO()
  sys.stderr = io.StringIO()
\`);

// Execute
await pyodide.runPythonAsync(snippet);

// Capture output
const stdout = pyodide.runPython("sys.stdout.getvalue()");
const stderr = pyodide.runPython("sys.stderr.getvalue()");`}</pre>
            <p>
              The WASM sandbox isn't perfect — a malicious snippet can spin up a tight CPU loop.
              We enforce a 20-second timeout via the V8 isolate and a separate memory limit.
              Any snippet that exceeds either limit is terminated and reported as a timeout finding.
            </p>

            <h2 className="text-xl font-bold text-white">Bash and curl: simulated execution</h2>
            <p>
              Bash and curl examples can't be safely executed in WASM — they're inherently about
              interacting with the host system and network. We handle them differently:
            </p>
            <div className="space-y-3">
              {[
                {
                  name: "curl examples",
                  desc: "Parsed and executed as real HTTP requests against a network-allowlisted environment. The allowlist is derived from the base_url in your docsci.yml or passed as openapi_url. Any request to a host not on the allowlist is rejected with a finding.",
                },
                {
                  name: "Shell variable validation",
                  desc: "Bash snippets are statically analyzed: we check that referenced environment variables are documented in the surrounding text, and that command substitutions don't produce obvious errors. Full execution is skipped — we run structural validation only.",
                },
                {
                  name: "Credential detection",
                  desc: "All snippets — regardless of language — are scanned for 40+ credential patterns before any execution. A snippet containing what looks like a real API key is flagged and skipped, never executed.",
                },
              ].map(item => (
                <div key={item.name} className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
                  <h3 className="text-white font-medium text-sm mb-1">{item.name}</h3>
                  <p className="text-gray-400 text-xs">{item.desc}</p>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-bold text-white">Network isolation and allowlists</h2>
            <p>
              Network access is one of the hardest parts of docs execution. Many code examples make real HTTP
              requests — that's the whole point. But allowing arbitrary outbound network access from a
              shared execution environment is a serious risk.
            </p>
            <p>
              DocsCI's network model works like this:
            </p>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`# docsci.yml — network allowlist configuration
snippets:
  # Hosts that snippets are allowed to contact
  network_allowlist:
    - "api.example.com"          # your staging API
    - "httpbin.org"              # common testing service
    - "*.github.com"             # GitHub API examples
    - "cdn.jsdelivr.net"         # CDN for WASM packages

  # Always blocked (regardless of allowlist)
  network_blocklist:
    - "169.254.169.254"          # AWS metadata
    - "10.0.0.0/8"               # Private ranges
    - "192.168.0.0/16"
    - "172.16.0.0/12"
    - "localhost"
    - "127.0.0.1"
    - "::1"`}</pre>
            <p>
              Private IP ranges and cloud metadata endpoints are always blocked, regardless of allowlist configuration.
              This prevents a class of SSRF-via-docs attacks where a malicious contributor could extract
              cloud credentials through documentation snippets.
            </p>

            <h2 className="text-xl font-bold text-white">Performance: the worker pool</h2>
            <p>
              A typical documentation repo has 50-300 code snippets. Running them serially would take minutes.
              DocsCI uses a worker pool where each worker manages its own set of pre-warmed isolates.
              A "warm" isolate has Pyodide loaded and the common stdlib imported — startup cost is paid once
              per worker per deploy, not once per snippet.
            </p>
            <p>
              In practice, this means a 200-snippet documentation repo completes in 30-60 seconds,
              even with a mix of Python and JavaScript examples.
            </p>

            <h2 className="text-xl font-bold text-white">What this means for your docs</h2>
            <p>
              The practical result of hermetic execution is that DocsCI results are reliable and safe to run
              on every pull request. There's no "works on my machine" — either the snippet runs in the sandbox
              as documented, or it doesn't, and you get a precise finding with the error. No flakiness from
              shared state. No security incidents from credential-containing snippets. No queue blockage from
              long-running examples.
            </p>

            <div className="p-5 bg-indigo-950 border border-indigo-700 rounded-xl mt-8">
              <h3 className="text-white font-semibold mb-2">Try hermetic execution on your docs</h3>
              <p className="text-indigo-200 text-sm mb-4">Free tier: 100 runs/month, all languages, full security scanning.</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/signup" className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition-colors">
                  Get started free →
                </Link>
                <Link href="/docs/integrations/github-actions" className="inline-block px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg text-sm transition-colors border border-gray-600">
                  GitHub Actions setup
                </Link>
              </div>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
