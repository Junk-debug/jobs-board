import { describe, expect, it } from "vitest";
import { ApiError, isRetryableError } from "./errors";

describe("isRetryableError", () => {
  it.each([
    [503, true],
    [500, true],
    [429, true],
    [408, true],
    [401, false],
    [400, false],
    [404, false],
  ])("treats status %i as retryable: %s", (status, expected) => {
    expect(isRetryableError(ApiError.fromStatus(status))).toBe(expected);
  });

  it("retries a failed request", () => {
    expect(isRetryableError(new ApiError("network", "Offline"))).toBe(true);
  });

  it("does not retry a response that fails validation", () => {
    expect(isRetryableError(new ApiError("invalid_response", "Bad"))).toBe(
      false
    );
  });
});
