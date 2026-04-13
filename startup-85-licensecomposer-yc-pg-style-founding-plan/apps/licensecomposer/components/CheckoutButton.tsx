"use client";

import { useState } from "react";

interface CheckoutButtonProps {
  priceId: string;
  mode?: "subscription" | "payment";
  label?: string;
  className?: string;
}

export default function CheckoutButton({
  priceId,
  mode = "subscription",
  label = "Subscribe",
  className,
  templateId,
  templateSlug,
}: CheckoutButtonProps & { templateId?: string; templateSlug?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, mode, templateId, templateSlug }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        setLoading(false);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || !priceId}
      className={
        className ||
        "bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      }
    >
      {loading ? "Redirecting to Stripe…" : label}
    </button>
  );
}

// Named export for backward compat
export { CheckoutButton };
