import { Metadata } from 'next';
import BillingClient from './BillingClient';

export const metadata: Metadata = {
  title: 'Billing — TeachRepo Dashboard',
};

export default function BillingPage() {
  return <BillingClient />;
}
