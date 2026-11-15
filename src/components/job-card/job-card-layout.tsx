import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type JobCardPay = {
  primary: ReactNode;
  secondary?: ReactNode;
};

type JobCardLayoutProps = {
  title: ReactNode;
  meta: ReactNode;
  pay?: JobCardPay;
  action: ReactNode;
  className?: string;
};

export function JobCardLayout({
  title,
  meta,
  pay,
  action,
  className,
}: JobCardLayoutProps) {
  return (
    <Card
      size="sm"
      className={cn("relative flex-row items-start gap-4 px-5", className)}
    >
      <div className="flex min-h-[calc(4lh+0.75rem)] min-w-0 flex-1 flex-col gap-1.5 text-base leading-snug sm:min-h-[calc(3lh+0.375rem)]">
        <div className="font-heading font-medium">{title}</div>
        <div className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground">
          {meta}
        </div>
        {pay && (
          <div className="flex min-w-0 items-center gap-1 text-sm sm:hidden">
            <div className="shrink-0 font-medium">{pay.primary}</div>
            {pay.secondary && (
              <div className="truncate text-muted-foreground">
                {pay.secondary}
              </div>
            )}
          </div>
        )}
      </div>

      {pay && (
        <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
          <div className="text-base leading-snug font-medium whitespace-nowrap">
            {pay.primary}
          </div>
          {pay.secondary && (
            <div className="text-xs whitespace-nowrap text-muted-foreground">
              {pay.secondary}
            </div>
          )}
        </div>
      )}

      <div className="relative z-10 -my-2 -mr-2 shrink-0">{action}</div>
    </Card>
  );
}
