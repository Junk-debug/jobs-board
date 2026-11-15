import { isRouteErrorResponse, useRouteError } from "react-router";
import { isApiError } from "@/api/errors";
import { ErrorState } from "@/components/error-state";
import { NotFoundPage } from "./not-found-page";

export function RouteError() {
  const error = useRouteError();

  const isNotFound =
    (isRouteErrorResponse(error) && error.status === 404) ||
    (isApiError(error) && error.kind === "not_found");

  if (isNotFound) {
    return <NotFoundPage />;
  }

  return <ErrorState error={error} onRetry={() => window.location.reload()} />;
}
