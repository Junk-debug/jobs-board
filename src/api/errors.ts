type ApiErrorKind = "not_found" | "network" | "server" | "invalid_response";

type ApiErrorOptions = {
  status?: number;
  cause?: unknown;
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;

  constructor(
    kind: ApiErrorKind,
    message: string,
    options: ApiErrorOptions = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = options.status;
  }

  static fromStatus(status: number, errorCode?: string): ApiError {
    if (status === 404) {
      return new ApiError("not_found", "Resource not found", { status });
    }

    const code = errorCode ? ` (${errorCode})` : "";
    return new ApiError(
      "server",
      `Request failed with status ${status}${code}`,
      { status }
    );
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const RETRYABLE_KINDS: ReadonlySet<ApiErrorKind> = new Set([
  "network",
  "server",
]);

const RETRYABLE_CLIENT_STATUSES: ReadonlySet<number> = new Set([408, 429]);

function isPermanentClientError(status: number | undefined) {
  return (
    status !== undefined &&
    status >= 400 &&
    status < 500 &&
    !RETRYABLE_CLIENT_STATUSES.has(status)
  );
}

export function isRetryableError(error: unknown): boolean {
  return (
    isApiError(error) &&
    RETRYABLE_KINDS.has(error.kind) &&
    !isPermanentClientError(error.status)
  );
}
