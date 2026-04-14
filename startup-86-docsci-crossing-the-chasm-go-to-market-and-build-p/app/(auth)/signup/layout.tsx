import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Sign Up — DocsCI",
  description: "Create a free DocsCI account and stop shipping broken docs.",
};
export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
