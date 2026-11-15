import { z } from "zod";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const persistedFavouritesSchema = z.object({ ids: z.array(z.string()) });

type FavouritesState = {
  ids: string[];
  toggle: (id: string) => void;
};

export const useFavouritesStore = create<FavouritesState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) =>
        set(({ ids }) => ({
          ids: ids.includes(id)
            ? ids.filter((savedId) => savedId !== id)
            : [...ids, id],
        })),
    }),
    {
      name: "coople-jobs:favourites",
      partialize: ({ ids }) => ({ ids }),
      merge: (persisted, current) => ({
        ...current,
        ids: persistedFavouritesSchema.safeParse(persisted).data?.ids ?? [],
      }),
    }
  )
);

export function useFavourite(id: string) {
  const isFavourite = useFavouritesStore(({ ids }) => ids.includes(id));
  const toggleFavourite = useFavouritesStore(({ toggle }) => toggle);

  return { isFavourite, toggle: () => toggleFavourite(id) };
}
