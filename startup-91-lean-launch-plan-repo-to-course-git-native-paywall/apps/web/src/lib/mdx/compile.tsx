import { compileMDX } from 'next-mdx-remote/rsc';
import { Callout } from '@/components/mdx/Callout';
import { SandboxEmbed } from '@/components/mdx/SandboxEmbed';

/**
 * MDX component map for lesson rendering.
 * Quiz is injected per-page since it needs runtime props (quizId, enrolled, etc.)
 * SandboxEmbed + Callout are static components safe to register globally.
 */
export const mdxComponents = {
  Callout,
  SandboxEmbed,
};

export type MdxComponents = typeof mdxComponents;

interface CompileLessonMdxOptions {
  bodyMd: string;
  components?: Record<string, React.ComponentType<unknown>>;
}

/**
 * Compile lesson Markdown body to a React component tree (server-side).
 * Uses next-mdx-remote/rsc for App Router compatibility.
 */
export async function compileLessonMdx({ bodyMd, components = {} }: CompileLessonMdxOptions) {
  const { content } = await compileMDX({
    source: bodyMd,
    options: {
      parseFrontmatter: false,   // frontmatter already stripped by importer
      mdxOptions: {
        remarkPlugins: [],
        rehypePlugins: [],
      },
    },
    components: {
      ...mdxComponents,
      ...components,
    },
  });

  return content;
}
