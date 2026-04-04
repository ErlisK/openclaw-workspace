import type { Metadata } from "next";
import AuthClient from "../AuthClient";

export const metadata: Metadata = { title: "Sign in — Change Risk Radar" };
interface SP { redirect?: string }
export default async function LoginPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  return (
    <div style={{ padding: "4rem 0" }}>
      <div className="container">
        <AuthClient mode="login" redirectTo={sp.redirect ?? "/onboard"} />
      </div>
    </div>
  );
}
