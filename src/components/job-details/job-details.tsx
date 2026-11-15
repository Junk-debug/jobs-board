import {
  CalendarIcon,
  ClockIcon,
  ExternalLinkIcon,
  LayersIcon,
  MapPinIcon,
  WalletIcon,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import { FavouriteButton } from "@/components/favourite-button";
import { Button } from "@/components/ui/button";
import type { JobDetails as JobDetailsModel } from "@/entities/job";
import {
  formatDate,
  formatDuration,
  formatHourlyWage,
  formatJobTitle,
  formatLocation,
  formatMoney,
  formatPeriod,
} from "@/lib/format";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h3 className="mt-6 text-base font-medium">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mt-6 text-base font-medium">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 text-base font-medium">{children}</h3>
  ),
  p: ({ children }) => <p className="mt-3 leading-relaxed">{children}</p>,
  ul: ({ children }) => (
    <ul className="mt-3 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-3 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  strong: ({ children }) => <strong className="font-medium">{children}</strong>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline underline-offset-4"
    >
      {children}
    </a>
  ),
};

type FactProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
};

function Fact({ icon: Icon, label, children }: FactProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-muted/60 p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <dl>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-medium">{children}</dd>
      </dl>
    </div>
  );
}

type JobDetailsProps = {
  job: JobDetailsModel;
};

export function JobDetails({ job }: JobDetailsProps) {
  const title = formatJobTitle(job.title);

  return (
    <article className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Published {formatDate(job.publishedAt)}
          </p>
        </div>
        <FavouriteButton jobId={job.id} jobTitle={title} />
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Fact icon={MapPinIcon} label="Location">
          {formatLocation(job.location)}
          {job.location.region && `, ${job.location.region}`}
        </Fact>
        <Fact icon={CalendarIcon} label="Period">
          {formatPeriod(job.startsAt, job.endsAt)}
        </Fact>
        {job.hourlyWage && (
          <Fact icon={WalletIcon} label="Hourly wage">
            {formatHourlyWage(job.hourlyWage)}
          </Fact>
        )}
        {job.totalPay && (
          <Fact icon={WalletIcon} label="Total pay">
            {formatMoney(job.totalPay)}
          </Fact>
        )}
        {job.shiftsCount != null && (
          <Fact icon={LayersIcon} label="Shifts">
            {job.shiftsCount}
          </Fact>
        )}
        {job.workDurationMinutes != null && (
          <Fact icon={ClockIcon} label="Total working time">
            {formatDuration(job.workDurationMinutes)}
          </Fact>
        )}
      </div>

      <section aria-labelledby="job-description" className="text-sm">
        <h2 id="job-description" className="text-lg font-medium">
          Description
        </h2>
        {job.description ? (
          <Markdown components={markdownComponents}>{job.description}</Markdown>
        ) : (
          <p className="mt-3 text-muted-foreground">No description provided.</p>
        )}
      </section>

      {job.applyUrl && (
        <div>
          <Button asChild>
            <a href={job.applyUrl} target="_blank" rel="noreferrer">
              Apply on Coople
              <ExternalLinkIcon data-icon="inline-end" />
            </a>
          </Button>
        </div>
      )}
    </article>
  );
}
