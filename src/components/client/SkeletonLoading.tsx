import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonLoadingProps {
  variant?: "default" | "card" | "list" | "detail";
  count?: number;
  className?: string;
}

export const SkeletonLoading: React.FC<SkeletonLoadingProps> = ({
  variant = "default",
  count = 1,
  className,
}) => {
  if (variant === "card") {
    return (
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card text-card-foreground shadow space-y-3 p-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2 pt-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="space-y-2">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
            </div>
        </div>
      </div>
    );
  }

  // Default / fallback
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
};
