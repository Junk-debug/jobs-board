import { useOnInView } from "react-intersection-observer";

type LoadMoreOnScrollOptions = {
  canLoadMore: boolean;
  onLoadMore: () => void;
  distanceFromEnd?: string;
};

export function useLoadMoreOnScroll({
  canLoadMore,
  onLoadMore,
  distanceFromEnd = "600px",
}: LoadMoreOnScrollOptions) {
  return useOnInView(
    (isEndNear) => {
      if (isEndNear) {
        onLoadMore();
      }
    },
    { rootMargin: distanceFromEnd, skip: !canLoadMore }
  );
}
