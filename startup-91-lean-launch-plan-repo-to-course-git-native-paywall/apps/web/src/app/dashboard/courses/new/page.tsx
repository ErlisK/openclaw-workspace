import { redirect } from 'next/navigation';

export default function NewCourseRedirect() {
  redirect('/dashboard/new');
}
