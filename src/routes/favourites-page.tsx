import { Link } from "react-router";
import { ErrorState } from "@/components/error-state";
import { JobCard } from "@/components/job-card/job-card";
import { JobCardSkeleton } from "@/components/job-card/job-card-skeleton";
import { MessageState } from "@/components/message-state";
import { Button } from "@/components/ui/button";
import { UnavailableJob } from "@/components/unavailable-job";
import { type FavouriteJob, useFavouriteJobs } from "@/queries/jobs.queries";
import { useFavouritesStore } from "@/stores/favourites.store";

function FavouriteItem({
  favourite,
  onRemove,
}: {
  favourite: FavouriteJob;
  onRemove: () => void;
}) {
  switch (favourite.status) {
    case "pending":
      return <JobCardSkeleton />;
    case "success":
      return <JobCard job={favourite.job} />;
    case "not_found":
      return <UnavailableJob onRemove={onRemove} />;
    case "error":
      return null;
  }
}

export function FavouritesPage() {
  const ids = useFavouritesStore(({ ids }) => ids);
  const toggle = useFavouritesStore(({ toggle }) => toggle);
  const { jobs, error, retry } = useFavouriteJobs(ids);
  const visibleJobs = jobs.filter(({ status }) => status !== "error");
  const isLoading = jobs.some(({ status }) => status === "pending");

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Saved jobs
        </h1>
        <p className="text-muted-foreground text-sm">
          Kept in this browser only
        </p>
      </div>

      {ids.length === 0 ? (
        <MessageState
          title="No saved jobs yet"
          description="Use the bookmark on a job to keep it here."
          action={
            <Button asChild variant="outline">
              <Link to="/">Browse jobs</Link>
            </Button>
          }
        />
      ) : (
        <>
          {error && <ErrorState error={error} onRetry={retry} />}
          <div role="status" className="sr-only">
            {isLoading && "Loading saved jobs"}
          </div>
          <ul className="flex flex-col gap-3">
            {visibleJobs.map((favourite) => (
              <li key={favourite.id}>
                <FavouriteItem
                  favourite={favourite}
                  onRemove={() => toggle(favourite.id)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
