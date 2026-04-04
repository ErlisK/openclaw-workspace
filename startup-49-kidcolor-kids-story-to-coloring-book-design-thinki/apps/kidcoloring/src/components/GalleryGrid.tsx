'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface GalleryItem {
  id:         string
  image_url:  string
  subject:    string | null
  hero_name:  string | null
  age_range:  string | null
  theme_tags: string[]
  is_featured: boolean
  view_count: number
  created_at: string
}

// Curated placeholder gallery for when user DB is still empty
const PLACEHOLDER_ITEMS: GalleryItem[] = [
  {
    id: 'ph1', image_url: 'https://image.pollinations.ai/prompt/cute%20friendly%20dinosaur%20coloring%20page%20for%20kids%20black%20and%20white%20line%20art?width=400&height=400&nologo=true&seed=101',
    subject: 'Dinosaur Adventure', hero_name: 'Rex', age_range: '4-6',
    theme_tags: ['dinosaurs'], is_featured: true, view_count: 142, created_at: new Date().toISOString(),
  },
  {
    id: 'ph2', image_url: 'https://image.pollinations.ai/prompt/magical%20unicorn%20rainbow%20coloring%20page%20for%20children%20black%20and%20white%20line%20art?width=400&height=400&nologo=true&seed=202',
    subject: 'Unicorn Magic', hero_name: 'Sparkle', age_range: '5-8',
    theme_tags: ['unicorns'], is_featured: true, view_count: 289, created_at: new Date().toISOString(),
  },
  {
    id: 'ph3', image_url: 'https://image.pollinations.ai/prompt/cute%20robot%20in%20space%20coloring%20page%20for%20kids%20black%20and%20white%20line%20art?width=400&height=400&nologo=true&seed=303',
    subject: 'Space Robot', hero_name: 'Zap', age_range: '6-9',
    theme_tags: ['robots', 'space'], is_featured: false, view_count: 97, created_at: new Date().toISOString(),
  },
  {
    id: 'ph4', image_url: 'https://image.pollinations.ai/prompt/friendly%20dragon%20flying%20over%20castle%20coloring%20page%20black%20white%20line%20art?width=400&height=400&nologo=true&seed=404',
    subject: 'Dragon Kingdom', hero_name: 'Ember', age_range: '5-9',
    theme_tags: ['dragons'], is_featured: false, view_count: 183, created_at: new Date().toISOString(),
  },
  {
    id: 'ph5', image_url: 'https://image.pollinations.ai/prompt/mermaid%20under%20ocean%20coloring%20page%20for%20kids%20black%20white%20outline?width=400&height=400&nologo=true&seed=505',
    subject: 'Ocean Adventure', hero_name: 'Marina', age_range: '4-7',
    theme_tags: ['mermaids', 'ocean'], is_featured: true, view_count: 231, created_at: new Date().toISOString(),
  },
  {
    id: 'ph6', image_url: 'https://image.pollinations.ai/prompt/cute%20puppy%20playing%20in%20garden%20coloring%20page%20black%20white%20simple%20lines?width=400&height=400&nologo=true&seed=606',
    subject: 'Puppy Playtime', hero_name: 'Biscuit', age_range: '3-6',
    theme_tags: ['puppies'], is_featured: false, view_count: 178, created_at: new Date().toISOString(),
  },
  {
    id: 'ph7', image_url: 'https://image.pollinations.ai/prompt/rocket%20ship%20blasting%20through%20stars%20kids%20coloring%20page%20black%20white?width=400&height=400&nologo=true&seed=707',
    subject: 'Rocket Adventure', hero_name: 'Cosmo', age_range: '5-8',
    theme_tags: ['space'], is_featured: false, view_count: 112, created_at: new Date().toISOString(),
  },
  {
    id: 'ph8', image_url: 'https://image.pollinations.ai/prompt/princess%20in%20castle%20with%20flowers%20coloring%20page%20for%20kids%20black%20white?width=400&height=400&nologo=true&seed=808',
    subject: 'Princess Castle', hero_name: 'Sofia', age_range: '4-7',
    theme_tags: ['princesses'], is_featured: false, view_count: 195, created_at: new Date().toISOString(),
  },
]

export default function GalleryGrid() {
  const searchParams = useSearchParams()
  const themeFilter  = searchParams.get('theme')
  
  const [items,   setItems]   = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [usingPlaceholders, setUsingPlaceholders] = useState(false)

  const loadItems = useCallback(async (pg: number = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(pg) })
      if (themeFilter) params.set('theme', themeFilter)
      const r    = await fetch(`/api/v1/gallery?${params}`)
      const data = await r.json() as { items: GalleryItem[]; hasMore: boolean }
      
      if (data.items.length === 0 && pg === 1) {
        // Use placeholder gallery until real content accumulates
        const filtered = themeFilter
          ? PLACEHOLDER_ITEMS.filter(i => i.theme_tags.includes(themeFilter))
          : PLACEHOLDER_ITEMS
        setItems(filtered)
        setUsingPlaceholders(true)
        setHasMore(false)
      } else {
        setItems(pg === 1 ? data.items : prev => [...prev, ...data.items])
        setHasMore(data.hasMore)
        setUsingPlaceholders(false)
      }
    } catch {
      setItems(PLACEHOLDER_ITEMS)
      setUsingPlaceholders(true)
    } finally {
      setLoading(false)
    }
  }, [themeFilter])

  useEffect(() => {
    setPage(1)
    void loadItems(1)
  }, [loadItems])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    void loadItems(next)
  }

  if (loading && items.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl aspect-square animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {usingPlaceholders && (
        <p className="text-center text-sm text-gray-400 mb-6">
          ✨ Sample gallery — yours will appear here after you create and share!
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map(item => (
          <GalleryCard key={item.id} item={item} />
        ))}
      </div>
      {hasMore && (
        <div className="text-center mt-8">
          <button onClick={loadMore} disabled={loading}
            className="bg-violet-100 text-violet-700 font-bold px-6 py-3 rounded-xl hover:bg-violet-200 transition-colors">
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
      {items.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">🎨</p>
          <p className="font-semibold">No pages yet for this theme</p>
          <Link href="/create/interests" className="text-violet-600 underline text-sm mt-2 block">
            Be the first to create one!
          </Link>
        </div>
      )}
    </div>
  )
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const label = item.subject ?? (item.hero_name ? `${item.hero_name}'s adventure` : 'Coloring page')
  return (
    <div className="group relative rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow aspect-square">
      <Image
        src={item.image_url}
        alt={`${label} coloring page for kids`}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
        className="object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
      {/* Watermark overlay */}
      <div className="absolute bottom-2 right-2 bg-white/70 backdrop-blur-sm text-gray-500 text-[10px] font-semibold px-1.5 py-0.5 rounded-full pointer-events-none">
        KidColoring.app
      </div>
      {/* Hover info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
        <div>
          <p className="text-white text-xs font-semibold truncate">{label}</p>
          {item.age_range && (
            <p className="text-white/70 text-[10px]">Ages {item.age_range}</p>
          )}
        </div>
      </div>
      {item.is_featured && (
        <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          ⭐ Featured
        </div>
      )}
    </div>
  )
}
