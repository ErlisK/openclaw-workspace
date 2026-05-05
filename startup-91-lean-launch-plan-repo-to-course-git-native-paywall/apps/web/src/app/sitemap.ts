import type { MetadataRoute } from 'next';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://teachrepo.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supa = createServiceClient();

  // Fetch published courses + their lessons
  const { data: courses } = await supa
    .from('courses')
    .select('slug, updated_at')
    .eq('published', true)
    .order('updated_at', { ascending: false });

  const { data: lessons } = await supa
    .from('lessons')
    .select('slug, updated_at, course_id, courses!inner(slug, published)')
    .eq('courses.published', true)
    .order('updated_at', { ascending: false });

  const courseUrls: MetadataRoute.Sitemap = (courses ?? []).map((c) => ({
    url: `${BASE_URL}/courses/${c.slug}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const lessonUrls: MetadataRoute.Sitemap = (lessons ?? [])
    .filter((l) => {
      const c = l.courses as unknown as { slug: string; published: boolean };
      return c?.published;
    })
    .map((l) => {
      const c = l.courses as unknown as { slug: string };
      return {
        url: `${BASE_URL}/courses/${c.slug}/lessons/${l.slug}`,
        lastModified: new Date(l.updated_at),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      };
    });

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/marketplace`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/docs`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/docs/quickstart`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/docs/cli`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/docs/course-yaml`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/docs/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/docs/self-hosting`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/blog/monetize-github-repo`, lastModified: new Date('2025-05-01'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/blog/gated-sandboxes`, lastModified: new Date('2025-04-23'), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/blog/yaml-frontmatter-quizzes`, lastModified: new Date('2025-04-22'), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/blog/from-markdown-to-paywalled-course`, lastModified: new Date('2025-04-21'), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/blog/why-git-native-courses`, lastModified: new Date('2025-04-20'), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/blog/introducing-teachrepo`, lastModified: new Date('2025-04-19'), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/auth/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/auth/signup`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
  ];

  return [...staticPages, ...courseUrls, ...lessonUrls];
}
