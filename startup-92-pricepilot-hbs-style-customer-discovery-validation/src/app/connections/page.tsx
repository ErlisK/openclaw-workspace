import { redirect } from 'next/navigation'

// /connections redirects to the settings/connections page
export default function ConnectionsPage() {
  redirect('/settings/connections')
}
