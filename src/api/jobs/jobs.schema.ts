import { z } from "zod";

export const jobIdSchema = z.guid();

const moneyDtoSchema = z.object({
  amount: z.number(),
  currencyId: z.number(),
});

const jobLocationDtoSchema = z.object({
  zip: z.string(),
  city: z.string(),
  state: z.string().nullish(),
  countryId: z.number(),
});

export const jobSummaryDtoSchema = z.object({
  workAssignmentId: z.string().min(1),
  workAssignmentName: z.string(),
  hourlyWage: moneyDtoSchema.nullish(),
  salary: moneyDtoSchema.nullish(),
  jobLocation: jobLocationDtoSchema,
  periodFrom: z.number(),
  datePublished: z.number(),
  branchLink: z.url().nullish(),
});

export const jobDetailsDtoSchema = jobSummaryDtoSchema.extend({
  requirements: z.string().nullish(),
  periodTo: z.number().nullish(),
  shiftsCount: z.number().nullish(),
  workDuration: z.number().nullish(),
});

export const jobsPageDtoSchema = z.object({
  items: z.array(z.unknown()),
  total: z.number(),
});

export type MoneyDto = z.output<typeof moneyDtoSchema>;
export type JobSummaryDto = z.output<typeof jobSummaryDtoSchema>;
