import { SkeletonCard } from '@/components/SkeletonCard'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Stats grid skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} rows={2} />
        ))}
      </div>

      {/* Content skeletons */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* AlertFeed skeleton */}
        <div className="lg:col-span-2">
          <div className="mb-4 h-6 w-32 skeleton-shimmer rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} rows={2} />
            ))}
          </div>
        </div>

        {/* Devices skeleton */}
        <div>
          <div className="mb-4 h-6 w-24 skeleton-shimmer rounded" />
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <SkeletonCard key={i} rows={3} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
