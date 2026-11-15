import { QueryClient } from "@tanstack/react-query";
import { isRetryableError } from "@/api/errors";

const MAX_RETRIES = 2;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          isRetryableError(error) && failureCount < MAX_RETRIES,
      },
    },
  });
}
