import * as React from 'react';
import { Callout } from '@/components/mdx/Callout';
import { SandboxEmbed } from '@/components/mdx/SandboxEmbed';

export const mdxComponents = { Callout, SandboxEmbed };

export async function compileLessonMdx({ bodyMd, components = {} }: { bodyMd: string; components?: Record<string, unknown> }) {
  // next-mdx-remote v6: compileMDX is available from next-mdx-remote/rsc
  const { compileMDX } = await import('next-mdx-remote/rsc');
  const { content } = await compileMDX({
    source: bodyMd,
    options: { parseFrontmatter: false },
    components: { ...mdxComponents, ...components } as Parameters<typeof compileMDX>[0]['components'],
  });
  return content;
}
