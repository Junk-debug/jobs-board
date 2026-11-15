import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import {
  resetIntersectionMocking,
  setupIntersectionMocking,
} from "react-intersection-observer/test-utils";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { useFavouritesStore } from "@/stores/favourites.store";
import { server } from "./server";

window.scrollTo = vi.fn();

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));

beforeEach(() => setupIntersectionMocking(vi.fn));

afterEach(() => {
  cleanup();
  resetIntersectionMocking();
  server.resetHandlers();
  useFavouritesStore.setState({ ids: [] });
  localStorage.clear();
});

afterAll(() => server.close());
