import { redirect } from 'next/navigation';

interface Props {
  params: { slug: string };
}

export default function LessonsIndexPage({ params }: Props) {
  // Redirect /courses/[slug]/lessons → /courses/[slug]
  redirect(`/courses/${params.slug}`);
}
