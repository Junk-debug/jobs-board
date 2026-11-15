import { describe, expect, it } from "vitest";
import { useFavouritesStore } from "./favourites.store";

const savedIds = () => useFavouritesStore.getState().ids;
const storageKey = useFavouritesStore.persist.getOptions().name ?? "";

describe("favourites store", () => {
  it("toggles a job on and off", () => {
    useFavouritesStore.getState().toggle("job-1");
    expect(savedIds()).toEqual(["job-1"]);

    useFavouritesStore.getState().toggle("job-1");
    expect(savedIds()).toEqual([]);
  });

  it("saves to localStorage and restores from it", async () => {
    useFavouritesStore.getState().toggle("job-1");
    const stored = localStorage.getItem(storageKey);
    expect(stored).toContain("job-1");

    useFavouritesStore.setState({ ids: [] });
    localStorage.setItem(storageKey, stored ?? "");
    await useFavouritesStore.persist.rehydrate();

    expect(savedIds()).toEqual(["job-1"]);
  });

  it("starts empty when the stored value is corrupted", async () => {
    localStorage.setItem(storageKey, "{not json");
    await useFavouritesStore.persist.rehydrate();
    expect(savedIds()).toEqual([]);

    localStorage.setItem(
      storageKey,
      JSON.stringify({ state: { ids: [1, 2] }, version: 0 })
    );
    await useFavouritesStore.persist.rehydrate();
    expect(savedIds()).toEqual([]);
  });
});
