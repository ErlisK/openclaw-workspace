import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function supabaseQuery(query: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/query_market_research`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ sql: query }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${err}`);
  }
  return res.json();
}

async function directQuery(query: string) {
  const projectRef = process.env.SUPABASE_PROJECT_REF!;
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function GET(req: NextRequest) {
  // Admin flag check
  const adminKey = req.headers.get("x-admin-key") || req.nextUrl.searchParams.get("admin_key");
  if (adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") || "all";
  const search = req.nextUrl.searchParams.get("q") || "";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100");

  let whereClause = "";
  if (type !== "all") whereClause += ` AND research_type = '${type}'`;
  if (search) whereClause += ` AND (title ILIKE '%${search}%' OR content::text ILIKE '%${search}%')`;

  const query = `
    SELECT id, research_type, title, content, tags, source, priority, created_at
    FROM market_research
    WHERE 1=1 ${whereClause}
    ORDER BY priority DESC, created_at DESC
    LIMIT ${limit}
  `;

  const data = await directQuery(query.trim());
  const counts = await directQuery(`SELECT research_type, COUNT(*) FROM market_research GROUP BY research_type`);

  return NextResponse.json({
    records: data,
    counts: Object.fromEntries(counts.map((r: { research_type: string; count: string }) => [r.research_type, parseInt(r.count)])),
    total: data.length,
  });
}

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { research_type, title, content, tags, source, priority } = body;

  const projectRef = process.env.SUPABASE_PROJECT_REF!;
  const tagsArray = JSON.stringify(tags || []).replace(/"/g, "'");
  
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        query: `INSERT INTO market_research (research_type, title, content, tags, source, priority) VALUES ('${research_type}', '${title.replace(/'/g, "''")}', '${JSON.stringify(content).replace(/'/g, "''")}'::jsonb, ARRAY[${(tags || []).map((t: string) => `'${t}'`).join(",")}], '${(source||"").replace(/'/g, "''")}', ${priority || 5}) RETURNING *`,
      }),
    }
  );
  const data = await res.json();
  return NextResponse.json({ record: data[0] }, { status: 201 });
}
