"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import type { AppEvent } from "@/lib/types";

export default function AuthCallbackClient() {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured) { router.replace("/"); return; }

    supabase.auth.exchangeCodeForSession(window.location.search)
      .then(({ data, error }) => {
        if (error) {
          track<Extract<AppEvent, { event: "auth_failed" }>>({
            event: "auth_failed", reason: error.message,
          });
          router.replace("/?auth=error");
        } else if (data.session) {
          track<Extract<AppEvent, { event: "auth_completed" }>>({
            event: "auth_completed", method: "magic_link",
          });
          router.replace("/");
        } else {
          router.replace("/");
        }
      });
  }, [router]);

  return null;
}
