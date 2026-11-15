import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { mockAllIsIntersecting } from "react-intersection-observer/test-utils";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/render-route";
import { fixtures, JOBS_LIST_URL, server } from "@/test/server";

const firstTitle = fixtures.jobsPage.data.items[0].workAssignmentName;

describe("Jobs page", () => {
  it("lists jobs with links to their details", async () => {
    renderRoute("/");

    const link = await screen.findByRole("link", { name: firstTitle });
    expect(link).toHaveAttribute(
      "href",
      `/job/${fixtures.jobsPage.data.items[0].workAssignmentId}`
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(
      fixtures.jobsPage.data.items.length
    );
  });

  it("shows an empty state when there are no jobs", async () => {
    server.use(
      http.get(JOBS_LIST_URL, () =>
        HttpResponse.json({
          status: 200,
          error: false,
          data: { items: [], total: 0 },
        })
      )
    );

    renderRoute("/");

    expect(
      await screen.findByText("No open jobs right now")
    ).toBeInTheDocument();
  });

  it("shows an error and recovers on retry", async () => {
    server.use(
      http.get(JOBS_LIST_URL, () => new HttpResponse(null, { status: 503 }), {
        once: true,
      })
    );

    renderRoute("/");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Something went wrong")).toBeInTheDocument();

    await userEvent.click(
      within(alert).getByRole("button", { name: "Try again" })
    );

    expect(
      await screen.findByRole("link", { name: firstTitle })
    ).toBeInTheDocument();
  });

  it("keeps loaded jobs when the next page fails and loads it on retry", async () => {
    const secondPage = {
      ...fixtures.jobsPage,
      data: {
        ...fixtures.jobsPage.data,
        items: fixtures.jobsPage.data.items.map((item) => ({
          ...item,
          workAssignmentId: `${item.workAssignmentId}-page-2`,
        })),
      },
    };
    let failSecondPage = true;
    server.use(
      http.get(JOBS_LIST_URL, ({ request }) => {
        if (new URL(request.url).searchParams.get("pageNum") === "0") {
          return HttpResponse.json(fixtures.jobsPage);
        }
        if (failSecondPage) {
          failSecondPage = false;
          return new HttpResponse(null, { status: 503 });
        }
        return HttpResponse.json(secondPage);
      })
    );
    const pageSize = fixtures.jobsPage.data.items.length;

    renderRoute("/");
    await screen.findByRole("link", { name: firstTitle });
    act(() => mockAllIsIntersecting(true));

    expect(
      await screen.findByText("Couldn't load more jobs.")
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(pageSize);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(pageSize * 2)
    );
    expect(
      screen.queryByText("Couldn't load more jobs.")
    ).not.toBeInTheDocument();
  });
});
