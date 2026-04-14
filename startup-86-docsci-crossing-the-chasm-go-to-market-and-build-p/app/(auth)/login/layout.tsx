import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Sign In — DocsCI",
  description: "Sign in to your DocsCI account.",
};
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
