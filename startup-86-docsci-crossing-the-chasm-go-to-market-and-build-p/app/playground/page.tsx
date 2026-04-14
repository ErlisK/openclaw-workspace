"use client";
import { useState, useRef } from "react";

const DEFAULT_JS = `// Run any JavaScript snippet here
const nums = [1, 2, 3, 4, 5];
const sum = nums.reduce((a, b) => a + b, 0);
console.log("Sum:", sum);
console.log("DocsCI Playground 🚀");
`;

export default function PlaygroundPage() {
  const [code, setCode] = useState(DEFAULT_JS);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  function runCode() {
    setRunning(true);
    setOutput([]);

    const logs: string[] = [];

    try {
      const workerBlob = new Blob(
        [
          `
self.onmessage = function(e) {
  const logs = [];
  const origConsole = {
    log: (...a) => self.postMessage({ type: 'log', text: a.map(x => String(x)).join(' ') }),
    error: (...a) => self.postMessage({ type: 'error', text: a.map(x => String(x)).join(' ') }),
    warn: (...a) => self.postMessage({ type: 'warn', text: a.map(x => String(x)).join(' ') }),
  };
  const sandboxConsole = { log: origConsole.log, error: origConsole.error, warn: origConsole.warn };
  try {
    const fn = new Function('console', e.data.code);
    fn(sandboxConsole);
    self.postMessage({ type: 'done' });
  } catch(err) {
    self.postMessage({ type: 'error', text: String(err) });
    self.postMessage({ type: 'done' });
  }
};
          `,
        ],
        { type: "application/javascript" }
      );

      const url = URL.createObjectURL(workerBlob);
      const worker = new Worker(url);
      workerRef.current = worker;

      const timeout = setTimeout(() => {
        worker.terminate();
        setOutput((prev) => [...prev, "⏱ Execution timed out (5s)"]);
        setRunning(false);
        URL.revokeObjectURL(url);
      }, 5000);

      worker.onmessage = (e) => {
        if (e.data.type === "done") {
          clearTimeout(timeout);
          worker.terminate();
          URL.revokeObjectURL(url);
          setRunning(false);
        } else if (e.data.type === "log") {
          setOutput((prev) => [...prev, e.data.text]);
        } else if (e.data.type === "error") {
          setOutput((prev) => [...prev, `❌ ${e.data.text}`]);
        } else if (e.data.type === "warn") {
          setOutput((prev) => [...prev, `⚠️ ${e.data.text}`]);
        }
      };

      worker.onerror = (err) => {
        clearTimeout(timeout);
        setOutput((prev) => [...prev, `❌ Worker error: ${err.message}`]);
        setRunning(false);
        URL.revokeObjectURL(url);
      };

      worker.postMessage({ code });
    } catch (err) {
      setOutput([`❌ ${String(err)}`]);
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 text-white font-bold text-xl">
            <span>⚡</span> DocsCI
          </a>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400 text-sm">Public Playground</span>
        </div>
        <a
          href="/signup"
          className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Sign up to try full CI →
        </a>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">JavaScript Sandbox</h1>
          <p className="text-gray-400 text-sm">
            Run JavaScript snippets in-browser with no network access. This is a public demo — no account required.{" "}
            <a href="/signup" className="text-indigo-400 hover:underline">
              Sign up
            </a>{" "}
            to run real doc CI pipelines against your repositories.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Editor */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <span className="text-sm font-medium text-gray-300">JavaScript</span>
              <button
                onClick={runCode}
                disabled={running}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                {running ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Running…
                  </>
                ) : (
                  <>▶ Run</>
                )}
              </button>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-72 bg-gray-900 text-gray-100 font-mono text-sm p-4 resize-none focus:outline-none"
              spellCheck={false}
              data-testid="playground-editor"
            />
          </div>

          {/* Output */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <span className="text-sm font-medium text-gray-300">Output</span>
              {output.length > 0 && (
                <button
                  onClick={() => setOutput([])}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Clear
                </button>
              )}
            </div>
            <div
              className="h-72 overflow-y-auto p-4 font-mono text-sm"
              data-testid="playground-output"
            >
              {output.length === 0 && !running && (
                <span className="text-gray-600">Output will appear here…</span>
              )}
              {output.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("❌")
                      ? "text-red-400"
                      : line.startsWith("⚠️")
                      ? "text-yellow-400"
                      : "text-green-300"
                  }
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature hint */}
        <div className="mt-8 p-5 bg-indigo-950/50 border border-indigo-900 rounded-xl">
          <h3 className="text-indigo-300 font-semibold mb-2">What DocsCI does in production</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>✅ Executes code examples from your actual docs repo against real APIs</li>
            <li>✅ Detects SDK/API drift on every PR — before your users hit broken examples</li>
            <li>✅ Files precise GitHub PR comments with fixes and suggested edits</li>
            <li>✅ Runs hermetic sandboxes with ephemeral credentials for security</li>
          </ul>
          <a
            href="/signup"
            className="inline-flex items-center gap-1 mt-4 text-indigo-400 hover:text-indigo-300 text-sm font-medium"
          >
            Sign up to try the full pipeline →
          </a>
        </div>
      </div>
    </div>
  );
}
