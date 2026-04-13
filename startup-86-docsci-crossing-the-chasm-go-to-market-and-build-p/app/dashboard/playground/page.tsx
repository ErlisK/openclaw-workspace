"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";

const SAMPLE_SNIPPETS = {
  javascript: `// Simple DocsCI example verification
const sdk = { version: "2.0.0", name: "acme-sdk" };

async function createUser(name, email) {
  // In real docs, this would call your API
  if (!email.includes("@")) throw new Error("Invalid email");
  return { id: Math.random().toString(36).slice(2), name, email };
}

const user = await createUser("Alice", "alice@example.com");
console.log("Created user:", user);
console.log("SDK version:", sdk.version);`,

  typescript: `// TypeScript snippet — DocsCI strips types before execution
interface User {
  id: string;
  name: string;
  email: string;
}

async function fetchUser(id: string): Promise<User> {
  return { id, name: "Alice", email: "alice@example.com" };
}

const user: User = await fetchUser("user_123");
console.log("User:", user.name, "—", user.email);`,

  python: `# Python snippet execution example
import json

def validate_config(config: dict) -> bool:
    required = ["api_key", "base_url", "timeout"]
    missing = [k for k in required if k not in config]
    if missing:
        raise ValueError(f"Missing required fields: {missing}")
    return True

config = {
    "api_key": "sk-test-abc123",
    "base_url": "https://api.example.com",
    "timeout": 30
}

result = validate_config(config)
print(f"Config valid: {result}")
print(json.dumps(config, indent=2))`,
};

type Language = "javascript" | "typescript" | "python";

export default function PlaygroundPage() {
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(SAMPLE_SNIPPETS.python);
  const [result, setResult] = useState<{
    success: boolean;
    stdout: string;
    stderr: string;
    error?: string;
    execution_ms: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  function loadSample(lang: Language) {
    setLanguage(lang);
    setCode(SAMPLE_SNIPPETS[lang]);
    setResult(null);
  }

  async function runSnippet() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, stdout: "", stderr: "", error: String(err), execution_ms: 0 });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <span className="font-bold text-xl text-white">DocsCI</span>
            </Link>
            <span className="text-gray-600">/</span>
            <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">Dashboard</Link>
            <span className="text-gray-600">/</span>
            <span className="text-white text-sm">Snippet Playground</span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">⚗️ Snippet Playground</h1>
          <p className="text-gray-400">
            Run JS/TS and Python code snippets in isolated sandboxes — the same hermetic execution 
            DocsCI uses in your CI pipeline.
          </p>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-500 mr-2">Sample snippets:</span>
          {(["python", "javascript", "typescript"] as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => loadSample(lang)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                language === lang
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
              }`}
            >
              {lang === "javascript" ? "JavaScript" : lang === "typescript" ? "TypeScript" : "Python"}
            </button>
          ))}
        </div>

        {/* Code editor */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/70"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/70"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/70"></span>
              <span className="ml-3 text-xs text-gray-500 font-mono">snippet.{language === "typescript" ? "ts" : language === "python" ? "py" : "js"}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={e => setLanguage(e.target.value as Language)}
                className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded px-2 py-1 focus:outline-none"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
              </select>
            </div>
          </div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            className="w-full h-64 p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-y focus:outline-none"
            spellCheck={false}
          />
        </div>

        {/* Run button */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={runSnippet}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span> Running…
              </>
            ) : (
              <>▶ Run snippet</>
            )}
          </button>
          <span className="text-xs text-gray-500">
            Executed in hermetic sandbox · No network · Ephemeral environment
          </span>
        </div>

        {/* Results */}
        {result && (
          <div className={`bg-gray-900 border rounded-xl overflow-hidden ${result.success ? "border-green-700" : "border-red-700"}`}>
            <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${result.success ? "border-green-700 bg-green-950/30" : "border-red-700 bg-red-950/30"}`}>
              <span>{result.success ? "✅" : "❌"}</span>
              <span className="text-sm font-medium">{result.success ? "Passed" : "Failed"}</span>
              {result.execution_ms > 0 && (
                <span className="ml-auto text-xs text-gray-500">{result.execution_ms}ms</span>
              )}
            </div>
            {result.stdout && (
              <div className="p-4 border-b border-gray-800">
                <div className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">stdout</div>
                <pre className="text-sm text-gray-200 font-mono whitespace-pre-wrap">{result.stdout}</pre>
              </div>
            )}
            {(result.stderr || result.error) && (
              <div className="p-4">
                <div className="text-xs text-red-400 mb-1.5 font-medium uppercase tracking-wide">
                  {result.error ? "error" : "stderr"}
                </div>
                <pre className="text-sm text-red-300 font-mono whitespace-pre-wrap">{result.error || result.stderr}</pre>
              </div>
            )}
          </div>
        )}

        {/* Info cards */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: "🔒",
              title: "Hermetic Sandbox",
              desc: "No network access, no filesystem writes, ephemeral credentials. Zero flakiness from external state.",
            },
            {
              icon: "🤖",
              title: "AI Fix Comments",
              desc: "When a snippet fails, Claude generates a fix suggestion and unified diff patch automatically.",
            },
            {
              icon: "🏃",
              title: "Customer-Hosted Runners",
              desc: "Run on your own infra with your real credentials. DocsCI orchestrates; you provide the execution environment.",
            },
          ].map(card => (
            <div key={card.title} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="text-2xl mb-2">{card.icon}</div>
              <h3 className="font-semibold text-white mb-1.5 text-sm">{card.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
