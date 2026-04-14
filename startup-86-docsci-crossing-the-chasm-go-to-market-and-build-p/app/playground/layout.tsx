import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Playground — DocsCI",
  description: "Try DocsCI's interactive code playground. Run JavaScript and Python snippets in-browser with no account required.",
};
export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
