import { z } from "zod";

const envSchema = z.object({
  DEV: z.boolean(),
  VITE_API_BASE_URL: z.string().min(1).default("/api"),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}`
  );
}

export const env = parsed.data;
