import type { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="border-b border-gray-800 mb-6 pb-3">
        <nav className="flex items-center gap-4 text-xs">
          <a href="/admin" className="text-gray-400 hover:text-white transition-colors">Ops</a>
          <a href="/eval" className="text-gray-400 hover:text-white transition-colors">Eval</a>
          <a href="/" className="text-gray-400 hover:text-white transition-colors">← Workbench</a>
        </nav>
      </div>
      {children}
    </div>
  )
}
