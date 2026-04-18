export default function FinancialDisclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
        ⚠️ For informational purposes only — not financial advice.
      </p>
    )
  }

  return (
    <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      <strong>Disclaimer:</strong> GigAnalytics provides analytics and AI-generated insights for informational purposes only.
      Nothing here constitutes financial, tax, or investment advice. Consult a qualified professional before making financial decisions.
    </div>
  )
}
