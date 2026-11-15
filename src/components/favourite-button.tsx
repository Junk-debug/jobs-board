import { HeartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFavourite } from "@/stores/favourites.store";

type FavouriteButtonProps = {
  jobId: string;
  jobTitle: string;
  className?: string;
};

export function FavouriteButton({
  jobId,
  jobTitle,
  className,
}: FavouriteButtonProps) {
  const { isFavourite, toggle } = useFavourite(jobId);
  const label = isFavourite
    ? `Remove ${jobTitle} from favourites`
    : `Add ${jobTitle} to favourites`;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-pressed={isFavourite}
      aria-label={label}
      title={isFavourite ? "Remove from favourites" : "Add to favourites"}
      onClick={toggle}
      className={cn(
        isFavourite ? "text-brand" : "text-muted-foreground",
        className
      )}
    >
      <HeartIcon className={cn("size-5", isFavourite && "fill-current")} />
    </Button>
  );
}
