import { cn } from "cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-2xl bg-muted", className)}
      {...props}
    />
  );
}

function TextSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-[1lh] items-center", className)}>
      <Skeleton className="h-[0.75lh] w-full" />
    </div>
  );
}

export { Skeleton, TextSkeleton };
