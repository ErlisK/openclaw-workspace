#!/usr/bin/env node
/**
 * scripts/run-sql.ts
 * Runs arbitrary SQL against the Supabase project via Management API.
 * Usage: SUPABASE_PROJECT_REF=xxx SUPABASE_ACCESS_TOKEN=xxx npx ts-node scripts/run-sql.ts "SELECT 1"
 * Or pass SQL via stdin: cat migration.sql | npx ts-node scripts/run-sql.ts
 * Or pass a file path: npx ts-node scripts/run-sql.ts ./supabase/migrations/013_alert_dispatches.sql
 */

import https from "https";
import fs from "fs";
import path from "path";

async function runSQL(sql: string): Promise<void> {
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!projectRef) throw new Error("SUPABASE_PROJECT_REF env var required");
  if (!accessToken) throw new Error("SUPABASE_ACCESS_TOKEN env var required");

  const data = JSON.stringify({ query: sql });

  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: "api.supabase.com",
      path: `/v1/projects/${projectRef}/database/query`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        console.log("HTTP Status:", res.statusCode);
        try {
          const parsed = JSON.parse(body);
          console.log("Response:", JSON.stringify(parsed, null, 2));
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          } else {
            resolve();
          }
        } catch {
          console.log("Raw response:", body);
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          } else {
            resolve();
          }
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  let sql = "";
  const arg = process.argv[2];

  if (arg) {
    // Check if it's a file path
    const resolved = path.resolve(arg);
    if (fs.existsSync(resolved)) {
      console.log(`Reading SQL from file: ${resolved}`);
      sql = fs.readFileSync(resolved, "utf8");
    } else {
      // Treat as inline SQL
      sql = arg;
    }
  } else if (!process.stdin.isTTY) {
    // Read from stdin
    sql = fs.readFileSync("/dev/stdin", "utf8");
  } else {
    console.error("Usage: npx ts-node scripts/run-sql.ts <sql | file.sql>");
    process.exit(1);
  }

  console.log(`Executing SQL (${sql.length} chars)...`);
  await runSQL(sql);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
