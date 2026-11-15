import type { z } from "zod";
import {
  type JobSummaryDto,
  jobDetailsDtoSchema,
  jobSummaryDtoSchema,
  type MoneyDto,
} from "@/api/jobs/jobs.schema";

const CURRENCY_BY_ID: ReadonlyMap<number, string> = new Map([[1, "CHF"]]);

function toMoney(dto: MoneyDto | null | undefined) {
  if (!dto) {
    return null;
  }

  return {
    amount: dto.amount,
    currency: CURRENCY_BY_ID.get(dto.currencyId) ?? null,
  };
}

function toDate(timestamp: number | null | undefined) {
  return timestamp == null ? null : new Date(timestamp);
}

function toText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toJobSummary(dto: JobSummaryDto) {
  return {
    id: dto.workAssignmentId,
    title: toText(dto.workAssignmentName),
    hourlyWage: toMoney(dto.hourlyWage),
    totalPay: toMoney(dto.salary),
    location: {
      city: dto.jobLocation.city,
      zip: dto.jobLocation.zip,
      region: toText(dto.jobLocation.state),
    },
    startsAt: new Date(dto.periodFrom),
    publishedAt: new Date(dto.datePublished),
    applyUrl: dto.branchLink ?? null,
  };
}

export const jobSummarySchema = jobSummaryDtoSchema.transform(toJobSummary);

export const jobDetailsSchema = jobDetailsDtoSchema.transform((dto) => ({
  ...toJobSummary(dto),
  description: toText(dto.requirements),
  endsAt: toDate(dto.periodTo),
  shiftsCount: dto.shiftsCount ?? null,
  workDurationMinutes: dto.workDuration ?? null,
}));

export type JobSummary = z.output<typeof jobSummarySchema>;
export type JobDetails = z.output<typeof jobDetailsSchema>;
export type Money = NonNullable<JobSummary["hourlyWage"]>;
export type JobLocation = JobSummary["location"];
