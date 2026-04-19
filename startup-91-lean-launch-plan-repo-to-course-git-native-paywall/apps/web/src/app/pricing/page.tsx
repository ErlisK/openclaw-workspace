import type { Metadata } from 'next';
import PricingClient from './PricingClient';

export const metadata: Metadata = {
  title: 'Pricing — TeachRepo',
  description: 'Free self-hosted core forever. Hosted Creator plan at $29/mo unlocks managed hosting, marketplace listing, AI quizzes, and custom domains.',
  openGraph: {
    title: 'Pricing — TeachRepo',
    description: 'Ship your first course free. Upgrade when you need managed hosting and marketplace discovery.',
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
