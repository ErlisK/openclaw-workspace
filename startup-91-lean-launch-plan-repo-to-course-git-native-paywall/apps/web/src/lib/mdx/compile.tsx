import * as React from 'react';

/**
 * compileLessonMdx — compiles Markdown + MDX to a React element tree.
 * Uses next-mdx-remote v6 (RSC-compatible compileMDX).
 * 
 * Custom components available in lesson MDX:
 *   <Callout>text</Callout>
 *   <SandboxEmbed url="..." />
 * 
 * Note: Quiz and SandboxEmbed are injected by the lesson page directly
 * rather than as MDX components, since they need server-side data.
 */
export async function compileLessonMdx(source: string): Promise<React.ReactElement> {
  const { compileMDX } = await import('next-mdx-remote/rsc');

  const { content } = await compileMDX({
    source,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [],
        rehypePlugins: [],
      },
    },
    components: {
      // Callout component (inline)
      Callout: ({ children, type = 'info' }: { children: React.ReactNode; type?: string }) => {
        const styles: Record<string, string> = {
          info: 'border-blue-200 bg-blue-50 text-blue-900',
          warning: 'border-yellow-200 bg-yellow-50 text-yellow-900',
          danger: 'border-red-200 bg-red-50 text-red-900',
          success: 'border-green-200 bg-green-50 text-green-900',
        };
        const icons: Record<string, string> = { info: 'ℹ️', warning: '⚠️', danger: '🚨', success: '✅' };
        return (
          <div className={`my-4 flex gap-3 rounded-lg border p-4 ${styles[type] ?? styles.info}`}>
            <span>{icons[type] ?? icons.info}</span>
            <div className="text-sm">{children}</div>
          </div>
        );
      },
    },
  });

  return content as React.ReactElement;
}
