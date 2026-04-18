import { WirePage, WireCard, WireButton } from '../wireframe-components'

// WF-06: ROI Dashboard — true hourly + acquisition ROI
export default function ROIPage() {
  return (
    <WirePage nav="/roi">
      <h1 className="text-xl font-bold mb-1">Acquisition ROI</h1>
      <p className="text-gray-500 text-sm mb-6">Cost of earning from each stream — platform fees + ad spend</p>

      {/* ROI table */}
      <WireCard className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold">January 2024</span>
          <span className="text-xs text-gray-400">Last 30 days ▼</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-xs">
                <th className="text-left py-2 font-medium">Stream</th>
                <th className="text-right py-2 font-medium">Revenue</th>
                <th className="text-right py-2 font-medium">Cost</th>
                <th className="text-right py-2 font-medium">Net</th>
                <th className="text-right py-2 font-medium">ROI</th>
                <th className="text-right py-2 font-medium">$/hr</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Coaching', rev: 800, cost: 0, roi: '∞', rate: 200, tag: '' },
                { name: 'Acme Corp (LinkedIn)', rev: 5200, cost: 301, roi: '16.3×', rate: 137, tag: '' },
                { name: 'Upwork', rev: 2160, cost: 258, roi: '7.4×', rate: 53, tag: '▼ lowest' },
              ].map(r => (
                <tr key={r.name} className="border-b hover:bg-gray-50">
                  <td className="py-3 font-medium">{r.name} {r.tag && <span className="text-xs text-red-500">{r.tag}</span>}</td>
                  <td className="py-3 text-right">${r.rev.toLocaleString()}</td>
                  <td className="py-3 text-right text-red-600">${r.cost}</td>
                  <td className="py-3 text-right font-medium text-green-700">${(r.rev - r.cost).toLocaleString()}</td>
                  <td className="py-3 text-right font-bold">{r.roi}</td>
                  <td className="py-3 text-right font-bold">${r.rate}/hr</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold text-sm">
                <td className="py-2 pl-2">Total</td>
                <td className="py-2 text-right">$8,160</td>
                <td className="py-2 text-right text-red-600">$559</td>
                <td className="py-2 text-right text-green-700">$7,601</td>
                <td className="py-2 text-right">13.6×</td>
                <td className="py-2 text-right">$120/hr</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </WireCard>

      {/* Cost breakdowns */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <WireCard>
          <div className="font-medium text-sm mb-3">Acme Corp cost breakdown</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Stripe fees (2.9%)</span><span>$151</span></div>
            <div className="flex justify-between"><span className="text-gray-500">LinkedIn ads</span><span>$150</span></div>
            <div className="flex justify-between border-t pt-1 font-medium"><span>Total</span><span>$301</span></div>
          </div>
        </WireCard>
        <WireCard>
          <div className="font-medium text-sm mb-3">Upwork cost breakdown</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Upwork 10% fee</span><span>$240</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Connects (est.)</span><span>$18</span></div>
            <div className="flex justify-between border-t pt-1 font-medium"><span>Total</span><span>$258</span></div>
          </div>
        </WireCard>
      </div>

      {/* Add ad spend */}
      <WireCard>
        <div className="font-medium text-sm mb-3">Add ad spend</div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Channel</label>
            <select className="border rounded px-2 py-1.5 text-sm w-full">
              <option>LinkedIn Ads</option>
              <option>Google Ads</option>
              <option>Facebook</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Amount</label>
            <input defaultValue="150" className="border rounded px-2 py-1.5 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Attributed to</label>
            <select className="border rounded px-2 py-1.5 text-sm w-full">
              <option>Acme Corp</option>
              <option>NEFF Brand</option>
              <option>All direct</option>
            </select>
          </div>
        </div>
        <WireButton variant="primary" size="sm">Save ad spend</WireButton>
      </WireCard>

      <div className="fixed bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded font-mono">
        WF-06 · /roi
      </div>
    </WirePage>
  )
}
