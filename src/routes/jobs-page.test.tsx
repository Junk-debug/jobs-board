import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { mockAllIsIntersecting } from "react-intersection-observer/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { JOBS_PAGE_SIZE } from "@/api/jobs/jobs.api";
import { renderRoute } from "@/test/render-route";
import {
  fakeListPage,
  fixtures,
  JOBS_LIST_URL,
  LIST_TOTAL,
  listParams,
  server,
} from "@/test/server";

const firstTitle = fixtures.jobsPage.data.items[0].workAssignmentName;

describe("Jobs page", () => {
  it("lists jobs with links to their details", async () => {
    renderRoute("/");

    const link = await screen.findByRole("link", { name: firstTitle });
    expect(link).toHaveAttribute(
      "href",
      `/job/${fixtures.jobsPage.data.items[0].workAssignmentId}`
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(JOBS_PAGE_SIZE);
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
    let failSecondPage = true;
    server.use(
      http.get(JOBS_LIST_URL, ({ request }) => {
        const params = listParams(request);
        if (params.pageNum === 1 && failSecondPage) {
          failSecondPage = false;
          return new HttpResponse(null, { status: 503 });
        }
        return HttpResponse.json(fakeListPage(params));
      })
    );

    renderRoute("/");
    await screen.findByRole("link", { name: firstTitle });
    act(() => mockAllIsIntersecting(true));

    expect(
      await screen.findByText("Couldn't load more jobs.")
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(JOBS_PAGE_SIZE);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(JOBS_PAGE_SIZE * 2)
    );
    expect(
      screen.queryByText("Couldn't load more jobs.")
    ).not.toBeInTheDocument();
  });
});

const formatCount = (count: number) =>
  new Intl.NumberFormat("en-CH").format(count);
const fakeTitles = fakeListPage({
  pageNum: 0,
  pageSize: LIST_TOTAL,
}).data.items.map((item) => item.workAssignmentName);
const isKoch = (title: string) => /koch/i.test(title);
const kochCount = fakeTitles.filter(isKoch).length;
const kochInFirstBatch = fakeTitles
  .slice(0, JOBS_PAGE_SIZE)
  .filter(isKoch).length;
const kuecheCount = fakeTitles.filter((title) =>
  /k[uü]che/i.test(title)
).length;

type ListRequest = { pageNum: number; pageSize: number };

function recordListRequests() {
  const requests: ListRequest[] = [];
  server.events.on("request:start", ({ request }) => {
    if (new URL(request.url).pathname.endsWith("/list")) {
      requests.push(listParams(request));
    }
  });
  return requests;
}

function useListTotal(total: number) {
  server.use(
    http.get(JOBS_LIST_URL, ({ request }) =>
      HttpResponse.json(fakeListPage({ ...listParams(request), total }))
    )
  );
}

async function untilEveryBatchIsChecked(assertion: () => void) {
  await waitFor(() => {
    act(() => mockAllIsIntersecting(true));
    assertion();
  });
}

describe("Jobs page search", () => {
  afterEach(() => {
    server.events.removeAllListeners();
  });

  it("does not request jobs again after a search has loaded them", async () => {
    const requests = recordListRequests();
    renderRoute("/");
    await screen.findByRole("link", { name: firstTitle });

    await userEvent.type(screen.getByRole("searchbox"), "koch");
    await untilEveryBatchIsChecked(() =>
      expect(
        screen.getByText(`${kochCount} jobs match “koch”`)
      ).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    await screen.findByText(/jobs on Coople/);
    const requestsBeforeScroll = requests.length;
    act(() => mockAllIsIntersecting(true));

    await screen.findByText("You've seen all jobs.");
    expect(screen.getAllByRole("listitem")).toHaveLength(LIST_TOTAL);
    expect(requests).toHaveLength(requestsBeforeScroll);
  });

  it("searches the same batches the list loads, one after another", async () => {
    const requests = recordListRequests();
    renderRoute("/");
    await screen.findByRole("link", { name: firstTitle });

    await userEvent.type(screen.getByRole("searchbox"), "koch");
    await untilEveryBatchIsChecked(() =>
      expect(
        screen.getByText(`${kochCount} jobs match “koch”`)
      ).toBeInTheDocument()
    );

    expect(requests).toEqual([
      { pageNum: 0, pageSize: JOBS_PAGE_SIZE },
      { pageNum: 1, pageSize: JOBS_PAGE_SIZE },
      { pageNum: 2, pageSize: JOBS_PAGE_SIZE },
    ]);
  });

  it("counts matches with a plus until every batch is checked", async () => {
    renderRoute("/?q=koch");

    expect(
      await screen.findByText(`${kochInFirstBatch}+ jobs match “koch”`)
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(kochInFirstBatch);

    await untilEveryBatchIsChecked(() =>
      expect(
        screen.getByText(`${kochCount} jobs match “koch”`)
      ).toBeInTheDocument()
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(kochCount);
  });

  it("loads the next batch each time the end marker is still in view", async () => {
    const requests = recordListRequests();
    renderRoute("/?q=astronaut");
    await screen.findByText("Searching…");
    expect(requests).toHaveLength(1);

    act(() => mockAllIsIntersecting(true));
    await waitFor(() => expect(requests).toHaveLength(2));
    await waitFor(() =>
      expect(screen.queryByText("Loading more jobs")).not.toBeInTheDocument()
    );
    act(() => mockAllIsIntersecting(true));
    await waitFor(() => expect(requests).toHaveLength(3));
  });

  it("shows Searching… instead of no results while batches are left", async () => {
    renderRoute("/?q=astronaut");

    expect(await screen.findByText("Searching…")).toBeInTheDocument();
    expect(screen.queryByText(/No jobs match/)).not.toBeInTheDocument();
    expect(screen.queryByText(/jobs match/)).not.toBeInTheDocument();

    await untilEveryBatchIsChecked(() =>
      expect(screen.getByText("No jobs match “astronaut”")).toBeInTheDocument()
    );
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();
  });

  it("stops after 500 jobs and says how many it covered", async () => {
    useListTotal(900);
    const requests = recordListRequests();
    renderRoute("/?q=astronaut");

    await untilEveryBatchIsChecked(() =>
      expect(screen.getByText("No jobs match “astronaut”")).toBeInTheDocument()
    );

    expect(requests.map((request) => request.pageNum)).toEqual([0, 1, 2, 3, 4]);
    expect(
      screen.getByText(
        `Search covers the first ${formatCount(500)} of ${formatCount(900)} jobs.`
      )
    ).toBeInTheDocument();
  });

  it("gives an exact count with a note when the limit cut the search short", async () => {
    useListTotal(900);
    renderRoute("/?q=koch");

    await untilEveryBatchIsChecked(() =>
      expect(screen.getByText(/^\d+ jobs match “koch”$/)).toBeInTheDocument()
    );
    expect(
      screen.getByText(
        `Search covers the first ${formatCount(500)} of ${formatCount(900)} jobs.`
      )
    ).toBeInTheDocument();
  });

  it("searches the loaded jobs of a list that is already longer than the limit", async () => {
    useListTotal(900);
    renderRoute("/");
    await screen.findByRole("link", { name: firstTitle });
    for (const loaded of [200, 300, 400, 500, 600]) {
      act(() => mockAllIsIntersecting(true));
      await waitFor(() =>
        expect(screen.getAllByRole("listitem")).toHaveLength(loaded)
      );
    }

    await userEvent.type(screen.getByRole("searchbox"), "astronaut");

    expect(
      await screen.findByText("No jobs match “astronaut”")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `Search covers the first ${formatCount(600)} of ${formatCount(900)} jobs.`
      )
    ).toBeInTheDocument();
  });

  it("shows only jobs whose title matches, ignoring case and accents", async () => {
    const { router } = renderRoute("/");
    await screen.findByRole("link", { name: firstTitle });

    await userEvent.type(screen.getByRole("searchbox"), "KUCHE");
    await untilEveryBatchIsChecked(() =>
      expect(
        screen.getByText(`${kuecheCount} jobs match “KUCHE”`)
      ).toBeInTheDocument()
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(kuecheCount);
    expect(router.state.location.search).toBe("?q=KUCHE");
  });

  it("searches the query from the URL on load", async () => {
    renderRoute("/?q=koch");

    expect(
      await screen.findByText(`${kochInFirstBatch}+ jobs match “koch”`)
    ).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("koch");
  });

  it("brings back the full list when the search is cleared", async () => {
    const { router } = renderRoute("/?q=koch");
    await screen.findByText(/jobs match “koch”/);

    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(await screen.findByText(/jobs on Coople/)).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("searchbox")).toHaveFocus();
    expect(screen.getAllByRole("listitem")).toHaveLength(JOBS_PAGE_SIZE);
    expect(router.state.location.search).toBe("");
  });

  it("offers to show all jobs when nothing matches", async () => {
    renderRoute("/?q=astronaut");
    await untilEveryBatchIsChecked(() =>
      expect(screen.getByText("No jobs match “astronaut”")).toBeInTheDocument()
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Show all jobs" })
    );

    expect(
      await screen.findByRole("link", { name: firstTitle })
    ).toBeInTheDocument();
  });

  it("follows a link to the plain list while searching", async () => {
    const { router } = renderRoute("/?q=koch");
    await screen.findByText(/jobs match “koch”/);

    await act(() => router.navigate("/"));

    expect(await screen.findByText(/jobs on Coople/)).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("shows an error and recovers on retry", async () => {
    let failFirstBatch = true;
    server.use(
      http.get(JOBS_LIST_URL, ({ request }) => {
        if (failFirstBatch) {
          failFirstBatch = false;
          return new HttpResponse(null, { status: 503 });
        }
        return HttpResponse.json(fakeListPage(listParams(request)));
      })
    );

    renderRoute("/?q=koch");

    const alert = await screen.findByRole("alert");
    await userEvent.click(
      within(alert).getByRole("button", { name: "Try again" })
    );

    expect(
      await screen.findByText(`${kochInFirstBatch}+ jobs match “koch”`)
    ).toBeInTheDocument();
  });

  it("keeps the matches and offers a retry when a later batch fails", async () => {
    let failSecondBatch = true;
    server.use(
      http.get(JOBS_LIST_URL, ({ request }) => {
        const params = listParams(request);
        if (params.pageNum === 1 && failSecondBatch) {
          failSecondBatch = false;
          return new HttpResponse(null, { status: 503 });
        }
        return HttpResponse.json(fakeListPage(params));
      })
    );
    renderRoute("/?q=koch");
    await screen.findByText(`${kochInFirstBatch}+ jobs match “koch”`);
    act(() => mockAllIsIntersecting(true));

    expect(
      await screen.findByText("Couldn't load more jobs.")
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(kochInFirstBatch);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    await untilEveryBatchIsChecked(() =>
      expect(
        screen.getByText(`${kochCount} jobs match “koch”`)
      ).toBeInTheDocument()
    );
  });
});
