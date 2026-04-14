import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Contact — DocsCI",
  description: "Get in touch with the DocsCI team.",
};
export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
