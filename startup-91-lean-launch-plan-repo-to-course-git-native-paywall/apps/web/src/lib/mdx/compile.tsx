import * as React from 'react';

/**
 * compileLessonMdx — compiles Markdown + MDX to a React element tree.
 * Uses next-mdx-remote v6 (RSC-compatible compileMDX).
 *
 * Custom components available in lesson MDX:
 *   <Callout type="info|warning|danger|success">text</Callout>
 *   <Sandbox src="https://stackblitz.com/..." title="..." height={500} />
 *   <Sandbox src="https://codesandbox.io/..." provider="codesandbox" />
 *
 * Security: compileLessonMdx accepts `enrolled` and `courseSlug` params.
 * When `enrolled = false`, the `src` prop is replaced with an empty string
 * server-side so the real sandbox URL never reaches the browser HTML for
 * unenrolled users. The SandboxEmbed component shows a purchase CTA instead.
 */
export interface CompileLessonMdxOptions {
  /** Whether the current user is enrolled (or the lesson is a free preview) */
  enrolled: boolean;
  /** Course slug — used in the "Enroll to unlock" CTA href */
  courseSlug?: string;
}

export async function compileLessonMdx(
  source: string,
  options: CompileLessonMdxOptions = { enrolled: false },
): Promise<React.ReactElement> {
  const { compileMDX } = await import('next-mdx-remote/rsc');
  const { SandboxEmbed } = await import('@/components/mdx/SandboxEmbed');

  const { enrolled, courseSlug } = options;

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
      // ── Callout component ────────────────────────────────────────────────
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

      // ── Sandbox component — the main gated embed ─────────────────────────
      // Usage in MDX: <Sandbox src="https://..." title="My Sandbox" />
      //
      // Security: the `src` prop is cleared server-side when unenrolled,
      // so the real URL never reaches the browser for paid lessons.
      Sandbox: ({
        src,
        title,
        provider,
        height,
      }: {
        src?: string;
        title?: string;
        provider?: 'stackblitz' | 'codesandbox' | 'codepen';
        height?: number;
      }) => {
        // ── Security gate: strip URL if not enrolled ───────────────────────
        // Creators and enrolled users get the real URL.
        // Unenrolled users on paid lessons get an empty string → locked CTA.
        const resolvedUrl = enrolled ? (src ?? '') : '';

        return (
          <SandboxEmbed
            url={resolvedUrl}
            enrolled={enrolled}
            provider={provider ?? inferProvider(src ?? '')}
            courseSlug={courseSlug}
            title={title ?? 'Interactive Code Sandbox'}
            height={height ?? 500}
          />
        );
      },

      // Alias for backwards compatibility
      SandboxEmbed: ({
        src,
        url,
        title,
        provider,
        height,
      }: {
        src?: string;
        url?: string;
        title?: string;
        provider?: 'stackblitz' | 'codesandbox' | 'codepen';
        height?: number;
      }) => {
        const resolvedUrl = enrolled ? (src ?? url ?? '') : '';
        return (
          <SandboxEmbed
            url={resolvedUrl}
            enrolled={enrolled}
            provider={provider ?? inferProvider(src ?? url ?? '')}
            courseSlug={courseSlug}
            title={title ?? 'Interactive Code Sandbox'}
            height={height ?? 500}
          />
        );
      },
    },
  });

  return content as React.ReactElement;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function inferProvider(url: string): 'stackblitz' | 'codesandbox' | 'codepen' {
  if (url.includes('stackblitz.com')) return 'stackblitz';
  if (url.includes('codesandbox.io')) return 'codesandbox';
  if (url.includes('codepen.io')) return 'codepen';
  return 'stackblitz'; // default
}
