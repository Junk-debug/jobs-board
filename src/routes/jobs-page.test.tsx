import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { mockAllIsIntersecting } from "react-intersection-observer/test-utils";
import { afterEach, describe, expect, it } from "vitest";
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

const PAGE_SIZE_PARAM = "pageSize";
const formatCount = (count: number) =>
  new Intl.NumberFormat("en-CH").format(count);
const searchableTitles = fixtures.jobsPage.data.items.map(
  (item) => item.workAssignmentName
);
const kochTitles = searchableTitles.filter((title) => /koch/i.test(title));

function recordListPageSizes() {
  const pageSizes: string[] = [];
  server.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/list")) {
      pageSizes.push(url.searchParams.get(PAGE_SIZE_PARAM) ?? "");
    }
  });
  return pageSizes;
}

describe("Jobs page search", () => {
  afterEach(() => {
    server.events.removeAllListeners();
  });

  it("loads the full list only when someone searches", async () => {
    const pageSizes = recordListPageSizes();
    renderRoute("/");
    await screen.findByRole("link", { name: firstTitle });
    expect(pageSizes).toEqual(["30"]);

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search jobs by title" }),
      "koch"
    );

    expect(
      await screen.findByText(`${kochTitles.length} jobs match “koch”`)
    ).toBeInTheDocument();
    expect(pageSizes).toEqual(["30", "1000"]);
  });

  it("shows only jobs whose title matches, ignoring case and accents", async () => {
    const { router } = renderRoute("/");
    await screen.findByRole("link", { name: firstTitle });

    await userEvent.type(screen.getByRole("searchbox"), "KUCHE");

    expect(
      await screen.findByText("1 job matches “KUCHE”")
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(router.state.location.search).toBe("?q=KUCHE");
  });

  it("searches the query from the URL on load", async () => {
    renderRoute("/?q=koch");

    expect(
      await screen.findByText(`${kochTitles.length} jobs match “koch”`)
    ).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("koch");
    expect(screen.getAllByRole("listitem")).toHaveLength(kochTitles.length);
  });

  it("brings back the full list when the search is cleared", async () => {
    const { router } = renderRoute("/?q=koch");
    await screen.findByText(`${kochTitles.length} jobs match “koch”`);

    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(await screen.findByText(/jobs on Coople/)).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("searchbox")).toHaveFocus();
    expect(screen.getAllByRole("listitem")).toHaveLength(
      searchableTitles.length
    );
    expect(router.state.location.search).toBe("");
  });

  it("offers to show all jobs when nothing matches", async () => {
    renderRoute("/?q=astronaut");

    expect(
      await screen.findByText("No jobs match “astronaut”")
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Show all jobs" })
    );

    expect(
      await screen.findByRole("link", { name: firstTitle })
    ).toBeInTheDocument();
  });

  it("follows a link to the plain list while searching", async () => {
    const { router } = renderRoute("/?q=koch");
    await screen.findByText(`${kochTitles.length} jobs match “koch”`);

    await act(() => router.navigate("/"));

    expect(await screen.findByText(/jobs on Coople/)).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("says when search covers only part of the jobs", async () => {
    server.use(
      http.get(JOBS_LIST_URL, () =>
        HttpResponse.json({
          ...fixtures.jobsPage,
          data: { ...fixtures.jobsPage.data, total: 1234 },
        })
      )
    );

    renderRoute("/?q=koch");

    expect(
      await screen.findByText(
        `Search covers the first ${formatCount(1000)} of ${formatCount(1234)} jobs.`
      )
    ).toBeInTheDocument();
  });

  it("shows an error and recovers on retry", async () => {
    let failFullList = true;
    server.use(
      http.get(JOBS_LIST_URL, ({ request }) => {
        const pageSize = new URL(request.url).searchParams.get(PAGE_SIZE_PARAM);
        if (pageSize === "1000" && failFullList) {
          failFullList = false;
          return new HttpResponse(null, { status: 503 });
        }
        return HttpResponse.json(fixtures.jobsPage);
      })
    );

    renderRoute("/?q=koch");

    const alert = await screen.findByRole("alert");
    await userEvent.click(
      within(alert).getByRole("button", { name: "Try again" })
    );

    expect(
      await screen.findByText(`${kochTitles.length} jobs match “koch”`)
    ).toBeInTheDocument();
  });
});
