export function SkeletonLine({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) {
  return <div className={`skeleton-shimmer ${width} ${height} rounded`} />
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-slate-800 p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} width={i === rows - 1 ? 'w-2/3' : 'w-full'} />
      ))}
    </div>
  )
}
