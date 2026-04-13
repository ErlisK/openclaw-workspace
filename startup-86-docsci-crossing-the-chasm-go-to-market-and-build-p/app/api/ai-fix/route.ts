// POST /api/ai-fix — generate AI fix suggestion + patch diff for a failing snippet
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIFix } from "@/lib/ai-fix";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { snippet_id, code, language, error: snippetError, file_path } = await req.json();

  if (!code || !language) {
    return NextResponse.json({ error: "code and language required" }, { status: 400 });
  }

  const result = await generateAIFix({
    code,
    language,
    error: snippetError || "Snippet failed to execute",
    filePath: file_path || "unknown",
  });

  // If we have a snippet_id, update the record with the fix
  if (snippet_id) {
    await supabase
      .from("docsci_snippet_results")
      .update({
        ai_fix_suggestion: result.suggestion,
        patch_diff: result.patch,
      })
      .eq("id", snippet_id);
  }

  return NextResponse.json({
    suggestion: result.suggestion,
    patch: result.patch,
    snippet_id,
  });
}
