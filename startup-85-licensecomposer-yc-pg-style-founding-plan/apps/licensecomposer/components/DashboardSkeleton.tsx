/**
 * components/DashboardSkeleton.tsx
 * Animated skeleton placeholder for the dashboard loading state.
 */
export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Nav skeleton */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="h-6 w-28 bg-gray-200 rounded" />
        <div className="flex gap-3">
          <div className="h-8 w-24 bg-gray-200 rounded-lg" />
          <div className="h-8 w-8 bg-gray-200 rounded-full" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="h-3 w-16 bg-gray-200 rounded mb-3" />
              <div className="h-8 w-10 bg-gray-200 rounded" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="h-5 w-32 bg-gray-200 rounded" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-6 py-4 border-b border-gray-50 flex items-center gap-4">
              <div className="h-4 w-4 bg-gray-200 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-gray-200 rounded" />
                <div className="h-3 w-32 bg-gray-100 rounded" />
              </div>
              <div className="h-6 w-20 bg-gray-200 rounded-full" />
              <div className="h-8 w-24 bg-gray-200 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Second card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="h-5 w-40 bg-gray-200 rounded" />
          </div>
          {[...Array(2)].map((_, i) => (
            <div key={i} className="px-6 py-4 border-b border-gray-50 flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-56 bg-gray-200 rounded" />
                <div className="h-3 w-36 bg-gray-100 rounded" />
              </div>
              <div className="h-8 w-16 bg-gray-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
