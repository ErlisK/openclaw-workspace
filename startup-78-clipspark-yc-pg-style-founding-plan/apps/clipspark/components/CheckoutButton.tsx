'use client'
export default function CheckoutButton({
  priceId, mode, className, label
}: {
  priceId: string, mode: 'subscription' | 'payment', className: string, label: string
}) {
  async function handleClick() {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, mode }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }
  return (
    <button onClick={handleClick} className={className}>{label}</button>
  )
}
