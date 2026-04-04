// Stripe event → risk classification mapper
// Maps Stripe webhook event types to operational/pricing/legal/security risk

export interface StripeRiskEvent {
  risk_level: "high" | "medium" | "low";
  risk_category: "pricing" | "legal" | "operational" | "security";
  title: string;
  summary: string;
}

// Full Stripe event type map
const STRIPE_EVENT_MAP: Record<string, StripeRiskEvent> = {
  // ── Pricing changes ──────────────────────────────────────────────────────
  "price.created": {
    risk_level: "medium", risk_category: "pricing",
    title: "Stripe: New price object created",
    summary: "A new price has been created on your Stripe account. Review if this reflects an intended pricing change.",
  },
  "price.updated": {
    risk_level: "high", risk_category: "pricing",
    title: "Stripe: Price updated",
    summary: "An existing Stripe price was modified. Active subscriptions may be affected if this price is in use.",
  },
  "price.deleted": {
    risk_level: "high", risk_category: "pricing",
    title: "Stripe: Price deleted",
    summary: "A Stripe price object was deleted. Any active subscriptions or checkout sessions using this price may break.",
  },
  "product.created": {
    risk_level: "low", risk_category: "pricing",
    title: "Stripe: New product created",
    summary: "A new product was created on your Stripe account.",
  },
  "product.updated": {
    risk_level: "medium", risk_category: "pricing",
    title: "Stripe: Product updated",
    summary: "A product object was updated on your Stripe account. Review if pricing or metadata changed.",
  },
  "product.deleted": {
    risk_level: "high", risk_category: "pricing",
    title: "Stripe: Product deleted",
    summary: "A Stripe product was deleted. Subscriptions or payment links referencing this product may fail.",
  },
  // ── Subscriptions ────────────────────────────────────────────────────────
  "customer.subscription.created": {
    risk_level: "low", risk_category: "operational",
    title: "Stripe: New subscription created",
    summary: "A new customer subscription was started.",
  },
  "customer.subscription.updated": {
    risk_level: "high", risk_category: "operational",
    title: "Stripe: Subscription updated",
    summary: "A customer subscription was modified — plan, quantity, or billing cycle may have changed. Revenue impact possible.",
  },
  "customer.subscription.deleted": {
    risk_level: "high", risk_category: "operational",
    title: "Stripe: Subscription cancelled",
    summary: "A customer subscription was cancelled. Review churn impact and any associated access controls.",
  },
  "customer.subscription.paused": {
    risk_level: "medium", risk_category: "operational",
    title: "Stripe: Subscription paused",
    summary: "A customer subscription was paused. Access to paid features may need to be suspended.",
  },
  "customer.subscription.trial_will_end": {
    risk_level: "medium", risk_category: "operational",
    title: "Stripe: Trial ending soon",
    summary: "A customer subscription trial ends in 3 days. Ensure conversion flow is working.",
  },
  // ── Billing portal ───────────────────────────────────────────────────────
  "billing_portal.configuration.created": {
    risk_level: "medium", risk_category: "operational",
    title: "Stripe: Billing portal configuration created",
    summary: "A new customer billing portal configuration was created. Review what self-service actions are enabled.",
  },
  "billing_portal.configuration.updated": {
    risk_level: "high", risk_category: "operational",
    title: "Stripe: Billing portal configuration changed",
    summary: "Your Stripe billing portal configuration was updated. Customers' self-service options may have changed.",
  },
  // ── Account changes ──────────────────────────────────────────────────────
  "account.updated": {
    risk_level: "medium", risk_category: "operational",
    title: "Stripe: Account settings updated",
    summary: "Your Stripe account settings were modified. This may include payout schedule, statement descriptor, or capabilities.",
  },
  "account.application.deauthorized": {
    risk_level: "high", risk_category: "operational",
    title: "Stripe: Connected app deauthorized",
    summary: "A connected Stripe application was deauthorized. Integrations depending on this app will stop working.",
  },
  // ── Disputes / Fraud ─────────────────────────────────────────────────────
  "dispute.created": {
    risk_level: "high", risk_category: "operational",
    title: "Stripe: Chargeback / dispute created",
    summary: "A customer has initiated a chargeback. You have limited time to respond with evidence.",
  },
  "dispute.updated": {
    risk_level: "medium", risk_category: "operational",
    title: "Stripe: Dispute status updated",
    summary: "A chargeback dispute status has changed. Review the current status in your Stripe dashboard.",
  },
  "radar.early_fraud_warning.created": {
    risk_level: "high", risk_category: "security",
    title: "Stripe: Early fraud warning",
    summary: "Stripe Radar has flagged a potential fraudulent charge. Consider reviewing and refunding to avoid chargeback.",
  },
  // ── Payouts ──────────────────────────────────────────────────────────────
  "payout.failed": {
    risk_level: "high", risk_category: "operational",
    title: "Stripe: Payout failed",
    summary: "A Stripe payout to your bank account failed. Check your bank account details and available balance.",
  },
  "payout.paid": {
    risk_level: "low", risk_category: "operational",
    title: "Stripe: Payout completed",
    summary: "A Stripe payout was successfully sent to your bank account.",
  },
  // ── Legal / Capabilities ─────────────────────────────────────────────────
  "capability.updated": {
    risk_level: "high", risk_category: "legal",
    title: "Stripe: Account capability changed",
    summary: "A Stripe capability (e.g., card payments, ACH) was enabled or disabled. This may affect your ability to collect payments.",
  },
  "payment_method.attached": {
    risk_level: "low", risk_category: "operational",
    title: "Stripe: Payment method added",
    summary: "A new payment method was attached to a customer account.",
  },
  "payment_method.detached": {
    risk_level: "medium", risk_category: "operational",
    title: "Stripe: Payment method removed",
    summary: "A payment method was detached from a customer account. Check if this was the default payment method.",
  },
  // ── Invoices ─────────────────────────────────────────────────────────────
  "invoice.finalization_failed": {
    risk_level: "high", risk_category: "operational",
    title: "Stripe: Invoice finalization failed",
    summary: "An invoice could not be finalized due to a configuration error. Subscription renewal may be blocked.",
  },
  "invoice.payment_failed": {
    risk_level: "high", risk_category: "operational",
    title: "Stripe: Invoice payment failed",
    summary: "A subscription invoice payment failed. The customer may be entering a dunning process.",
  },
  // ── Checkout ─────────────────────────────────────────────────────────────
  "checkout.session.expired": {
    risk_level: "low", risk_category: "operational",
    title: "Stripe: Checkout session expired",
    summary: "A checkout session expired without completion. This may indicate checkout UX issues.",
  },
};

// Fallback for unmapped event types — use prefix matching
function fallbackClassify(eventType: string): StripeRiskEvent {
  const prefix = eventType.split(".")[0];
  const prefixMap: Record<string, StripeRiskEvent> = {
    price: { risk_level: "medium", risk_category: "pricing", title: `Stripe price event: ${eventType}`, summary: `Stripe fired event: ${eventType}` },
    product: { risk_level: "medium", risk_category: "pricing", title: `Stripe product event: ${eventType}`, summary: `Stripe fired event: ${eventType}` },
    customer: { risk_level: "medium", risk_category: "operational", title: `Stripe customer event: ${eventType}`, summary: `Stripe fired event: ${eventType}` },
    account: { risk_level: "medium", risk_category: "operational", title: `Stripe account event: ${eventType}`, summary: `Stripe fired event: ${eventType}` },
    dispute: { risk_level: "high", risk_category: "operational", title: `Stripe dispute event: ${eventType}`, summary: `Stripe fired event: ${eventType}` },
    invoice: { risk_level: "medium", risk_category: "operational", title: `Stripe invoice event: ${eventType}`, summary: `Stripe fired event: ${eventType}` },
    radar: { risk_level: "high", risk_category: "security", title: `Stripe fraud event: ${eventType}`, summary: `Stripe fired event: ${eventType}` },
  };
  return prefixMap[prefix] ?? {
    risk_level: "low", risk_category: "operational",
    title: `Stripe event: ${eventType}`,
    summary: `Stripe fired a webhook event: ${eventType}. Review in your Stripe dashboard.`,
  };
}

export function classifyStripeEvent(eventType: string): StripeRiskEvent {
  return STRIPE_EVENT_MAP[eventType] ?? fallbackClassify(eventType);
}

// High-priority events that should always generate alerts
export const HIGH_PRIORITY_STRIPE_EVENTS = new Set([
  "price.updated", "price.deleted", "product.deleted",
  "customer.subscription.updated", "customer.subscription.deleted",
  "billing_portal.configuration.updated",
  "account.updated", "account.application.deauthorized",
  "dispute.created", "radar.early_fraud_warning.created",
  "payout.failed", "invoice.finalization_failed",
  "invoice.payment_failed", "capability.updated",
]);
