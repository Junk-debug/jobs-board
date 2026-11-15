import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/server";
import { apiClient } from "./client";
import { ApiError } from "./errors";

const URL = "*/api/anything";

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) {
      return error;
    }
    throw error;
  }
  throw new Error("Expected the request to fail");
}

describe("apiClient.get", () => {
  it("unwraps data from a successful Coople response", async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.json({ status: 200, error: false, data: { ok: true } })
      )
    );

    await expect(apiClient.get("/anything")).resolves.toEqual({ ok: true });
  });

  it("treats error: true as a failure even with HTTP 200", async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.json({
          status: 500,
          error: true,
          errorCode: "Internal_error",
        })
      )
    );

    const error = await captureError(apiClient.get("/anything"));
    expect(error.kind).toBe("server");
    expect(error.message).toContain("Internal_error");
  });

  it("maps 404 to not_found", async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.json(
          { status: 404, error: true, errorCode: "Object_not_found" },
          { status: 404 }
        )
      )
    );

    const error = await captureError(apiClient.get("/anything"));
    expect(error.kind).toBe("not_found");
  });

  it("maps a non-JSON 5xx to server", async () => {
    server.use(
      http.get(URL, () => new HttpResponse("Bad gateway", { status: 502 }))
    );

    const error = await captureError(apiClient.get("/anything"));
    expect(error).toMatchObject({ kind: "server", status: 502 });
  });

  it("maps a failed request to network", async () => {
    server.use(http.get(URL, () => HttpResponse.error()));

    const error = await captureError(apiClient.get("/anything"));
    expect(error.kind).toBe("network");
  });

  it("rejects a 200 response without the Coople wrapper", async () => {
    server.use(http.get(URL, () => HttpResponse.json({ items: [] })));

    const error = await captureError(apiClient.get("/anything"));
    expect(error.kind).toBe("invalid_response");
  });
});
