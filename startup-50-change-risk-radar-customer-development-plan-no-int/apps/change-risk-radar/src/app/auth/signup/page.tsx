import type { Metadata } from "next";
import AuthClient from "../AuthClient";

export const metadata: Metadata = { title: "Sign up — Change Risk Radar" };
interface SP { redirect?: string }
export default async function SignupPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  return (
    <div style={{ padding: "4rem 0" }}>
      <div className="container">
        <AuthClient mode="signup" redirectTo={sp.redirect ?? "/onboard"} />
      </div>
    </div>
  );
}
