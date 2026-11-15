import type { QueryClient } from "@tanstack/react-query";
import type { RouteObject } from "react-router";
import { createJobPageLoader, JobPage } from "@/routes/job-page";
import { JobsPage } from "@/routes/jobs-page";
import { NotFoundPage } from "@/routes/not-found-page";
import { RootLayout } from "@/routes/root-layout";
import { RouteError } from "@/routes/route-error";

export function createRoutes(queryClient: QueryClient): RouteObject[] {
  return [
    {
      path: "/",
      element: <RootLayout />,
      children: [
        {
          errorElement: <RouteError />,
          children: [
            { index: true, element: <JobsPage /> },
            {
              path: "job/:id",
              loader: createJobPageLoader(queryClient),
              element: <JobPage />,
            },
            { path: "*", element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ];
}
