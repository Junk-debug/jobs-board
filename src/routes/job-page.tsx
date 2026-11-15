import type { QueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import {
  data,
  Link,
  type LoaderFunctionArgs,
  useLoaderData,
  useLocation,
  useNavigate,
} from "react-router";
import { jobIdSchema } from "@/api/jobs/jobs.schema";
import { ErrorState } from "@/components/error-state";
import { JobDetails } from "@/components/job-details/job-details";
import { JobDetailsSkeleton } from "@/components/job-details/job-details-skeleton";
import { Button } from "@/components/ui/button";
import { jobQueryOptions, useJob } from "@/queries/jobs.queries";

export function createJobPageLoader(queryClient: QueryClient) {
  return function jobPageLoader({ params }: LoaderFunctionArgs) {
    const id = jobIdSchema.safeParse(params.id);
    if (!id.success) {
      throw data(null, { status: 404 });
    }

    queryClient.prefetchQuery(jobQueryOptions(id.data));
    return { id: id.data };
  };
}

type JobPageLoaderData = ReturnType<ReturnType<typeof createJobPageLoader>>;

function BackToJobs() {
  const location = useLocation();
  const navigate = useNavigate();
  const cameFromApp = location.key !== "default";

  if (cameFromApp) {
    return (
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeftIcon data-icon="inline-start" />
        All jobs
      </Button>
    );
  }

  return (
    <Button asChild variant="ghost" size="sm">
      <Link to="/">
        <ArrowLeftIcon data-icon="inline-start" />
        All jobs
      </Link>
    </Button>
  );
}

function JobPageContent({ id }: { id: string }) {
  const { data: job, status, error, refetch } = useJob(id);

  if (status === "pending") {
    return (
      <div role="status" aria-label="Loading job">
        <JobDetailsSkeleton />
      </div>
    );
  }

  if (status === "error") {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  return <JobDetails job={job} />;
}

export function JobPage() {
  const { id } = useLoaderData<JobPageLoaderData>();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
      <div>
        <BackToJobs />
      </div>
      <JobPageContent key={id} id={id} />
    </div>
  );
}
