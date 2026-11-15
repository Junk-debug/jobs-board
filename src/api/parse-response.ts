import { z } from "zod";
import { env } from "@/env";
import { ApiError } from "./errors";

export function parseResponse<Schema extends z.ZodType>(
  schema: Schema,
  data: unknown
): z.output<Schema> {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  const details = env.DEV ? `:\n${z.prettifyError(result.error)}` : "";
  throw new ApiError(
    "invalid_response",
    `Response does not match the expected schema${details}`,
    { cause: result.error }
  );
}

function dropInvalidItems<Schema extends z.ZodType>(itemSchema: Schema) {
  return z.array(z.unknown()).transform((items) =>
    items.flatMap((item, index) => {
      const result = itemSchema.safeParse(item);

      if (result.success) {
        return [result.data as z.output<Schema>];
      }

      console.warn(
        `[api] Dropped list item ${index}, it does not match the schema`,
        z.prettifyError(result.error)
      );
      return [];
    })
  );
}

export function tolerantArray<Schema extends z.ZodType>(itemSchema: Schema) {
  return env.DEV ? z.array(itemSchema) : dropInvalidItems(itemSchema);
}
