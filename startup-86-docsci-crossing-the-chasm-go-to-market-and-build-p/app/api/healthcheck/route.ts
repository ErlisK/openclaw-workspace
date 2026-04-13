import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    // Verify Supabase connectivity with a simple query
    const { error } = await supabase
      .from("docsci_profiles")
      .select("id")
      .limit(1);
    
    return NextResponse.json({
      status: "ok",
      supabase: error ? "error" : "connected",
      rls: "enabled",
      tables: ["docsci_profiles", "docsci_orgs", "docsci_org_members", "docsci_projects", "docsci_runs", "docsci_findings", "docsci_suggestions", "docsci_integrations", "docsci_api_targets", "docsci_tokens"],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: String(err) },
      { status: 500 }
    );
  }
}
