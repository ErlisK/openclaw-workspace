import Link from 'next/link'

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="flex items-center gap-2 mb-12 text-gray-500 hover:text-gray-700 text-sm">
        <span>←</span> Back
      </Link>

      <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-3">
        What kind of book?
      </h1>
      <p className="text-gray-500 text-center mb-12 max-w-md">
        Two ways to make your personalized coloring book
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link href="/create/interests"
          className="group bg-white border-2 border-violet-200 hover:border-violet-400 rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Interest Packs</h2>
          <p className="text-gray-500 text-sm mb-6">
            Pick 3 things they love — dinosaurs, space, robots — and we&apos;ll build their book.
          </p>
          <span className="inline-block bg-violet-600 group-hover:bg-violet-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
            Choose interests →
          </span>
        </Link>

        <Link href="/create/story"
          className="group bg-white border-2 border-blue-200 hover:border-blue-400 rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all text-center">
          <div className="text-6xl mb-4">📖</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Story-to-Book</h2>
          <p className="text-gray-500 text-sm mb-6">
            Build a story: choose the hero, the world, the adventure — and name your character.
          </p>
          <span className="inline-block bg-blue-600 group-hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
            Tell a story →
          </span>
        </Link>
      </div>

      <p className="mt-10 text-xs text-gray-400">Free trial · 4 pages · No account needed</p>
    </div>
  )
}
