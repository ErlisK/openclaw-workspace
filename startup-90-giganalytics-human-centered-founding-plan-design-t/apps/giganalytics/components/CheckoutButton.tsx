"use client";

import { useState } from "react";

interface CheckoutButtonProps {
  priceId: string;
  mode?: "subscription" | "payment";
  label?: string;
  className?: string;
}

export function CheckoutButton({
  priceId,
  mode = "subscription",
  label = "Subscribe",
  className,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, mode }),
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
      disabled={loading}
      className={
        className ||
        "bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
      }
    >
      {loading ? "Redirecting..." : label}
    </button>
  );
}
