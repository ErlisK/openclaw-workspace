import type { QuizFile } from '@/lib/types/quiz';
import { Callout } from '@/components/mdx/Callout';
import { SandboxEmbed } from '@/components/mdx/SandboxEmbed';

export const mdxComponents = { Callout, SandboxEmbed };

export async function compileLessonMdx({ bodyMd, components = {} }: { bodyMd: string; components?: Record<string, unknown> }) {
  const { compileMDX } = await import('next-mdx-remote/rsc');
  const { content } = await compileMDX({
    source: bodyMd,
    options: { parseFrontmatter: false },
    components: { ...mdxComponents, ...components } as Record<string, React.ComponentType<unknown>>,
  });
  return content;
}

import * as React from 'react';
