import { AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { env } from "@/env";

type ErrorStateProps = {
  error: unknown;
  onRetry?: () => void;
};

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const details = env.DEV && error instanceof Error ? error.message : null;

  return (
    <div
      role="alert"
      className="flex gap-3 rounded-2xl border bg-card px-4 py-3 text-sm text-destructive"
    >
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-col items-start gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">Something went wrong</p>
          <p className="text-destructive/90">
            We couldn&apos;t load this from Coople. Try again in a moment.
          </p>
        </div>
        {details && (
          <pre className="max-w-full overflow-x-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap text-foreground">
            {details}
          </pre>
        )}
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
