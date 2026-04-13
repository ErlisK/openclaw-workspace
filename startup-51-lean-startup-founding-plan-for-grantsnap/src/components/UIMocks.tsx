'use client'

// Realistic UI mock: Grant Matching Dashboard screen
export function MockGrantDashboard() {
  const grants = [
    { funder: 'East Bay Community Foundation', program: 'Civic Engagement Fund', amount: '$15,000', deadline: 'Aug 15', match: 96, tags: ['Bay Area', 'Community Organizing'], status: 'new' },
    { funder: 'Zellerbach Family Foundation', program: 'Arts & Culture Program', amount: '$25,000', deadline: 'Sep 1', match: 88, tags: ['Arts', 'Bay Area'], status: 'new' },
    { funder: 'SF Arts Commission', program: 'Cultural Equity Initiative', amount: '$10,000', deadline: 'Aug 30', match: 82, tags: ['Arts', 'SF', 'BIPOC-led'], status: 'saved' },
    { funder: 'California Arts Council', program: 'Challenge America', amount: '$10,000', deadline: 'Oct 12', match: 79, tags: ['State', 'Arts', 'Underserved'], status: 'new' },
    { funder: 'PG&E Foundation', program: 'Community Impact', amount: '$7,500', deadline: 'Sep 20', match: 71, tags: ['Corporate', 'Environment'], status: 'new' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden" style={{ transform: 'perspective(1000px) rotateX(2deg)', transformOrigin: 'top center' }}>
      {/* Browser chrome */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded border border-gray-200 px-3 py-1 text-xs text-gray-400 ml-2">
          app.grantsnap.io/dashboard
        </div>
      </div>

      {/* App layout */}
      <div className="flex h-72">
        {/* Sidebar */}
        <div className="w-44 bg-gray-50 border-r border-gray-100 p-3 flex flex-col gap-1">
          <div className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1.5">
            <span className="text-base">📋</span> GrantSnap
          </div>
          {[
            { icon: '🎯', label: 'Matched Grants', active: true, count: 8 },
            { icon: '📝', label: 'My Proposals', active: false, count: 3 },
            { icon: '🧩', label: 'Block Library', active: false, count: 24 },
            { icon: '📅', label: 'Pipeline', active: false, count: null },
            { icon: '⚙️', label: 'Org Profile', active: false, count: null },
          ].map(item => (
            <div
              key={item.label}
              className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer ${item.active ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span className="flex items-center gap-1.5">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </span>
              {item.count && (
                <span className={`text-xs font-bold rounded-full px-1.5 py-0.5 ${item.active ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {item.count}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">This Week&apos;s Matches</h2>
              <p className="text-xs text-gray-500">8 grants matching Bay Area Youth Arts Collective</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">🔍 Filter</span>
              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200 font-medium">✓ Updated today</span>
            </div>
          </div>

          <div className="space-y-2">
            {grants.map((grant) => (
              <div key={grant.funder} className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50/30 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-gray-900 truncate">{grant.funder}</p>
                    {grant.status === 'new' && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium flex-shrink-0">NEW</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 truncate">{grant.program}</p>
                    <span className="text-gray-300">·</span>
                    <p className="text-xs text-gray-500 flex-shrink-0">Due {grant.deadline}</p>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {grant.tags.map(t => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-900">{grant.amount}</p>
                    <p className="text-xs text-gray-400">max award</p>
                  </div>
                  <div className={`text-sm font-bold px-2 py-1 rounded-lg ${grant.match >= 90 ? 'bg-green-100 text-green-700' : grant.match >= 80 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                    {grant.match}%
                  </div>
                  <button className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    Start →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Realistic UI mock: Block Library screen
export function MockBlockLibrary() {
  const blocks = [
    { type: 'ORG-MISSION', name: 'Mission Statement', variants: 4, lastUsed: '2 days ago', badge: '⭐', wordCount: '50–300w' },
    { type: 'NEED-COMM', name: 'Community Need', variants: 3, lastUsed: '1 week ago', badge: '🏆', wordCount: '150–750w' },
    { type: 'PROG-DESC', name: 'Program Description', variants: 5, lastUsed: 'Today', badge: '⭐', wordCount: '200–1,500w' },
    { type: 'BUDGET-NAR', name: 'Budget Narrative', variants: 2, lastUsed: '3 days ago', badge: '⭐', wordCount: '100–800w' },
    { type: 'GOALS-OBJ', name: 'Goals & Objectives', variants: 3, lastUsed: '5 days ago', badge: null, wordCount: '150–750w' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden" style={{ transform: 'perspective(1000px) rotateX(2deg)', transformOrigin: 'top center' }}>
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded border border-gray-200 px-3 py-1 text-xs text-gray-400 ml-2">
          app.grantsnap.io/blocks
        </div>
      </div>

      <div className="flex h-72">
        <div className="w-44 bg-gray-50 border-r border-gray-100 p-3 flex flex-col gap-1">
          <div className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1.5">
            <span className="text-base">📋</span> GrantSnap
          </div>
          {[
            { icon: '🎯', label: 'Matched Grants', active: false },
            { icon: '📝', label: 'My Proposals', active: false },
            { icon: '🧩', label: 'Block Library', active: true },
            { icon: '📅', label: 'Pipeline', active: false },
          ].map(item => (
            <div
              key={item.label}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs ${item.active ? 'bg-green-600 text-white' : 'text-gray-600'}`}
            >
              <span>{item.icon}</span><span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Block Library</h2>
              <p className="text-xs text-gray-500">24 blocks · Org: Bay Area Youth Arts Collective</p>
            </div>
            <button className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md">+ New Block</button>
          </div>

          {/* Active block */}
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-green-800">ORG-MISSION · Standard (175w)</span>
                  <span className="text-xs">⭐</span>
                  <span className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded">Used in 12 proposals</span>
                </div>
                <div className="mt-1 text-xs text-gray-700 leading-relaxed line-clamp-2">
                  Bay Area Youth Arts Collective is a 2018-founded nonprofit serving low-income youth ages 8–18 in Oakland and East Bay communities. Through free after-school visual arts, music, and performance programs, we build creative confidence and social-emotional skills...
                </div>
              </div>
              <div className="flex gap-1 ml-2 flex-shrink-0">
                <button className="text-xs bg-white text-gray-600 px-2 py-1 rounded border border-gray-200">Edit</button>
                <button className="text-xs bg-green-600 text-white px-2 py-1 rounded">Insert</button>
              </div>
            </div>
            <div className="flex gap-1">
              {['Micro 40w', 'Brief 100w', '✓ Standard 175w', 'Expanded 300w'].map(v => (
                <span key={v} className={`text-xs px-2 py-0.5 rounded cursor-pointer ${v.startsWith('✓') ? 'bg-green-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>{v}</span>
              ))}
            </div>
          </div>

          {/* Block list */}
          <div className="space-y-1.5">
            {blocks.slice(1).map((block) => (
              <div key={block.type} className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-gray-100 hover:border-green-200 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-900">{block.name}</span>
                    {block.badge && <span className="text-xs">{block.badge}</span>}
                    <span className="text-xs text-gray-400">{block.wordCount}</span>
                  </div>
                  <p className="text-xs text-gray-400">{block.variants} variants · Last used {block.lastUsed}</p>
                </div>
                <button className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded opacity-0 group-hover:opacity-100 border border-gray-200">Insert</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Realistic UI mock: Proposal Builder screen
export function MockProposalBuilder() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden" style={{ transform: 'perspective(1000px) rotateX(2deg)', transformOrigin: 'top center' }}>
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded border border-gray-200 px-3 py-1 text-xs text-gray-400 ml-2">
          app.grantsnap.io/proposals/ebcf-civic-2025
        </div>
      </div>

      <div className="flex h-72">
        {/* Left panel - block picker */}
        <div className="w-44 bg-gray-50 border-r border-gray-100 p-3">
          <p className="text-xs font-bold text-gray-700 mb-2">Required Sections</p>
          <div className="space-y-1">
            {[
              { name: 'Mission Statement', done: true },
              { name: 'Community Need', done: true },
              { name: 'Program Description', done: false, active: true },
              { name: 'Goals & Objectives', done: false },
              { name: 'Evaluation Plan', done: false },
              { name: 'Budget Narrative', done: false },
              { name: 'Equity Statement', done: false },
            ].map(s => (
              <div key={s.name} className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs cursor-pointer ${s.active ? 'bg-green-100 border border-green-300 text-green-800' : s.done ? 'text-gray-400' : 'text-gray-600 hover:bg-gray-100'}`}>
                <span className={s.done ? 'text-green-500' : s.active ? 'text-green-600' : 'text-gray-300'}>
                  {s.done ? '✓' : s.active ? '→' : '○'}
                </span>
                <span className={s.done ? 'line-through' : ''}>{s.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Progress</div>
            <div className="bg-gray-200 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '29%' }} />
            </div>
            <div className="text-xs text-gray-400 mt-1">2 / 7 sections</div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400">EBCF Civic Engagement Fund 2025</p>
              <h2 className="text-sm font-bold text-gray-900">Program Description</h2>
              <p className="text-xs text-gray-500">Required · 500–1,000 words · 0 / 650 words</p>
            </div>
            <div className="flex gap-1.5">
              <button className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-md">🧩 Insert block</button>
              <button className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-md">Save</button>
            </div>
          </div>

          {/* Inserted block */}
          <div className="border-2 border-dashed border-green-300 rounded-lg p-3 bg-green-50/50 mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-medium">PROG-DESC · Summer Arts Program</span>
                <span className="text-xs text-gray-400">312 words</span>
              </div>
              <div className="flex gap-1">
                <button className="text-xs text-gray-400 hover:text-gray-600">✏️ Edit</button>
                <button className="text-xs text-red-400 hover:text-red-600">✕</button>
              </div>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
              Bay Area Youth Arts Collective&apos;s Summer Intensive is a 6-week, full-day arts education program serving 45 youth ages 10–16 from East Oakland neighborhoods. Participants engage in daily sessions across visual arts, spoken word, and digital media...
            </p>
            <div className="mt-1.5 flex gap-1">
              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">{'⚠ Fill: {{funder_name}}'}</span>
              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">{'⚠ Fill: {{grant_amount}}'}</span>
            </div>
          </div>

          {/* Empty drop zone */}
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-400">Drop a block here or</p>
            <button className="text-xs text-green-600 font-medium mt-0.5">+ continue writing</button>
          </div>
        </div>
      </div>
    </div>
  )
}
