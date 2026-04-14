import { NextRequest, NextResponse } from "next/server";
import { runInNewContext } from "vm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, language } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    if (language === "python") {
      // Python runs client-side via Pyodide — server just acknowledges
      return NextResponse.json({
        output: "Python execution runs in-browser via Pyodide. Use the playground UI.",
        exitCode: 0,
        language: "python",
        note: "server-side Python not available; use browser playground",
      });
    }

    // JavaScript execution via Node.js vm sandbox
    const logs: string[] = [];
    const sandboxConsole = {
      log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
      error: (...args: unknown[]) => logs.push("error: " + args.map(String).join(" ")),
      warn: (...args: unknown[]) => logs.push("warn: " + args.map(String).join(" ")),
      info: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
    };

    const sandbox = {
      console: sandboxConsole,
      setTimeout: undefined,
      setInterval: undefined,
      fetch: undefined,
      require: undefined,
      process: undefined,
      global: undefined,
    };

    try {
      runInNewContext(code, sandbox, { timeout: 5000, filename: "playground.js" });
      return NextResponse.json({
        output: logs.join("\n") + (logs.length ? "\n" : ""),
        exitCode: 0,
      });
    } catch (err) {
      return NextResponse.json({
        output: String(err),
        exitCode: 1,
        error: true,
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", detail: String(err) },
      { status: 500 }
    );
  }
}
