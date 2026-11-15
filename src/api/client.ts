import { z } from "zod";
import { env } from "@/env";
import { ApiError } from "./errors";

const successResponseSchema = z.object({
  error: z.literal(false),
  data: z.unknown(),
});

const failureResponseSchema = z.object({
  error: z.literal(true),
  status: z.number(),
  errorCode: z.string().optional(),
});

const ResponseSchema = z.discriminatedUnion("error", [
  successResponseSchema,
  failureResponseSchema,
]);

type ApiClientConfig = {
  baseUrl: string;
};

type RequestOptions = {
  signal?: AbortSignal;
};

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    if (!response.ok) {
      throw ApiError.fromStatus(response.status);
    }

    throw new ApiError("invalid_response", "Response is not valid JSON", {
      status: response.status,
      cause,
    });
  }
}

async function fetchResponse(
  url: URL,
  { signal }: RequestOptions
): Promise<Response> {
  try {
    return await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (cause) {
    if (signal?.aborted) {
      throw cause;
    }

    throw new ApiError("network", "Network request failed", { cause });
  }
}

function unwrapCoopleResponse(response: Response, body: unknown): unknown {
  const parsedResponse = ResponseSchema.safeParse(body);

  if (!parsedResponse.success) {
    if (!response.ok) {
      throw ApiError.fromStatus(response.status);
    }

    throw new ApiError("invalid_response", "Unexpected response shape", {
      status: response.status,
      cause: parsedResponse.error,
    });
  }

  if (parsedResponse.data.error) {
    throw ApiError.fromStatus(
      parsedResponse.data.status,
      parsedResponse.data.errorCode
    );
  }

  if (!response.ok) {
    throw ApiError.fromStatus(response.status);
  }

  return parsedResponse.data.data;
}

function createApiClient({ baseUrl }: ApiClientConfig) {
  return {
    get: async (path: string, options: RequestOptions = {}) => {
      const url = new URL(`${baseUrl}${path}`, window.location.origin);
      const response = await fetchResponse(url, options);
      const body = await readJson(response);
      return unwrapCoopleResponse(response, body);
    },
  };
}

export const apiClient = createApiClient({ baseUrl: env.VITE_API_BASE_URL });
