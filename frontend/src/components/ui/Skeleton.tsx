interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className = "", count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} className={`skeleton ${className}`.trim()} aria-hidden="true" />
      ))}
    </>
  );
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="card-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card skeleton-card">
          <Skeleton className="skeleton--line skeleton--w40" />
          <Skeleton className="skeleton--line skeleton--w70" />
          <Skeleton className="skeleton--line skeleton--w55" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-rows" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-row">
          <Skeleton className="skeleton--avatar" />
          <div>
            <Skeleton className="skeleton--line skeleton--w45" />
            <Skeleton className="skeleton--line skeleton--w65" />
          </div>
        </div>
      ))}
    </div>
  );
}
