"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PricingPlan {
  name: string;
  price: string;
  interval?: string;
  description?: string;
  features: string[];
  priceId: string;
  mode?: "subscription" | "payment";
  popular?: boolean;
  isFree?: boolean;
}

interface PricingTableProps {
  plans: PricingPlan[];
  title?: string;
  subtitle?: string;
}

export function PricingTable({ plans, title, subtitle }: PricingTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  async function handlePlanClick(plan: PricingPlan) {
    if (plan.isFree || plan.priceId === 'free') {
      router.push('/signup');
      return;
    }
    setLoadingId(plan.priceId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.priceId, mode: plan.mode || "subscription" }),
      });
      if (res.status === 401) {
        router.push(`/signup?priceId=${encodeURIComponent(plan.priceId)}`);
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        setLoadingId(null);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setLoadingId(null);
    }
  }

  return (
    <section className="py-16 px-4">
      {title && (
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">{title}</h2>
          {subtitle && <p className="text-gray-600">{subtitle}</p>}
        </div>
      )}
      <div
        className={`grid gap-8 max-w-5xl mx-auto grid-cols-1 ${
          plans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
        }`}
      >
        {plans.map((plan) => (
          <div
            key={plan.priceId}
            className={`rounded-2xl border p-4 sm:p-8 flex flex-col ${
              plan.popular
                ? "border-blue-500 ring-2 ring-blue-500 shadow-lg relative"
                : "border-gray-200"
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Most Popular
              </span>
            )}
            <h3 className="text-xl font-semibold mb-2 text-gray-900" data-testid={`pricing-tier-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}>{plan.name}</h3>
            {plan.description && (
              <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
            )}
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
              {plan.interval && (
                <span className="text-gray-600 ml-1">/{plan.interval}</span>
              )}
            </div>
            <ul className="space-y-3 mb-8 flex-grow">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-green-600 shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handlePlanClick(plan)}
              disabled={loadingId === plan.priceId}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                plan.popular
                  ? "bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300"
                  : "bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-400"
              }`}
            >
              {loadingId === plan.priceId ? "Redirecting..." : "Get Started"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
