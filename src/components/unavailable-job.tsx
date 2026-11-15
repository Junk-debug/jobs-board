import { Button } from "@/components/ui/button";

type UnavailableJobProps = {
  onRemove: () => void;
};

export function UnavailableJob({ onRemove }: UnavailableJobProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-4xl border border-dashed px-6 py-4 text-sm text-muted-foreground">
      <span>This job is no longer available.</span>
      <Button variant="outline" size="sm" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}
