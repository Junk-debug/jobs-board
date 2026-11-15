import { CalendarIcon, MapPinIcon } from "lucide-react";
import { Link } from "react-router";
import { FavouriteButton } from "@/components/favourite-button";
import type { JobSummary } from "@/entities/job";
import {
  formatDate,
  formatHourlyWage,
  formatJobTitle,
  formatLocation,
  formatMoney,
} from "@/lib/format";
import { JobCardLayout, type JobCardPay } from "./job-card-layout";

type JobCardProps = {
  job: JobSummary;
};

function toPay(job: JobSummary): JobCardPay | undefined {
  if (!job.hourlyWage) {
    return undefined;
  }

  return {
    primary: formatHourlyWage(job.hourlyWage),
    secondary: job.totalPay ? `${formatMoney(job.totalPay)} total` : undefined,
  };
}

export function JobCard({ job }: JobCardProps) {
  const title = formatJobTitle(job.title);
  const location = formatLocation(job.location);

  return (
    <JobCardLayout
      className="transition-shadow hover:shadow-lg"
      title={
        <h2 className="line-clamp-2">
          <Link
            to={`/job/${job.id}`}
            title={title}
            className="outline-none after:absolute after:inset-0 after:rounded-4xl focus-visible:after:ring-3 focus-visible:after:ring-ring/30"
          >
            {title}
          </Link>
        </h2>
      }
      meta={
        <>
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate" title={location}>
              {location}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <CalendarIcon className="size-3.5 shrink-0" aria-hidden />
            <span>
              <span className="hidden sm:inline">Starts </span>
              {formatDate(job.startsAt)}
            </span>
          </span>
        </>
      }
      pay={toPay(job)}
      action={<FavouriteButton jobId={job.id} jobTitle={title} />}
    />
  );
}
