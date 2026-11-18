import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { mockAllIsIntersecting } from "react-intersection-observer/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JOBS_PAGE_SIZE } from "@/api/jobs/jobs.config";
import { renderRoute } from "@/test/render-route";
import {
  fakeListPage,
  fixtures,
  JOBS_LIST_URL,
  listParams,
  server,
} from "@/test/server";

vi.mock("@/api/jobs/jobs.config", () => ({ JOBS_PAGE_SIZE: 10 }));

const BATCH_COUNT = 3;
const LIST_TOTAL = JOBS_PAGE_SIZE * (BATCH_COUNT - 1) + 5;

const firstTitle = fixtures.jobsPage.data.items[0].workAssignmentName;

function serveListWithTotal(total: number) {
  server.use(
    http.get(JOBS_LIST_URL, ({ request }) =>
      HttpResponse.json(fakeListPage({ ...listParams(request), total }))
    )
  );
}

beforeEach(() => serveListWithTotal(LIST_TOTAL));

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
const kuecheHeading = `${kuecheCount} ${kuecheCount === 1 ? "job matches" : "jobs match"} “KUCHE”`;

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

async function searchFor(text: string) {
  await userEvent.click(screen.getByRole("searchbox"));
  await userEvent.paste(text);
}

async function loadNextBatch(
  requests: ListRequest[],
  expectedRequestCount: number
) {
  act(() => mockAllIsIntersecting(true));
  await waitFor(() => expect(requests).toHaveLength(expectedRequestCount));
  await waitFor(() =>
    expect(screen.queryByText("Loading more jobs")).not.toBeInTheDocument()
  );
}

describe("Jobs page search", () => {
  afterEach(() => {
    server.events.removeAllListeners();
  });

  it("does not request jobs again after a search has loaded them", async () => {
    const requests = recordListRequests();
    renderRoute("/");
    await screen.findByRole("link", { name: firstTitle });

    await searchFor("koch");
    await screen.findByText(`${kochInFirstBatch}+ jobs match “koch”`);
    await loadNextBatch(requests, 2);
    await loadNextBatch(requests, 3);
    expect(
      screen.getByText(`${kochCount} jobs match “koch”`)
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    await screen.findByText(/jobs on Coople/);
    act(() => mockAllIsIntersecting(true));

    expect(
      await screen.findByText("You've seen all jobs.")
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(LIST_TOTAL);
    expect(requests).toHaveLength(3);
  });

  it("searches the same batches the list loads, one after another", async () => {
    const requests = recordListRequests();
    renderRoute("/");
    await screen.findByRole("link", { name: firstTitle });

    await searchFor("koch");
    await screen.findByText(`${kochInFirstBatch}+ jobs match “koch”`);
    await loadNextBatch(requests, 2);
    await loadNextBatch(requests, 3);

    expect(requests).toEqual([
      { pageNum: 0, pageSize: JOBS_PAGE_SIZE },
      { pageNum: 1, pageSize: JOBS_PAGE_SIZE },
      { pageNum: 2, pageSize: JOBS_PAGE_SIZE },
    ]);
  });

  it("counts matches with a plus until every batch is checked", async () => {
    const requests = recordListRequests();
    renderRoute("/?q=koch");

    expect(
      await screen.findByText(`${kochInFirstBatch}+ jobs match “koch”`)
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(kochInFirstBatch);

    await loadNextBatch(requests, 2);
    expect(screen.getByText(/^\d+\+ jobs match “koch”$/)).toBeInTheDocument();
    await loadNextBatch(requests, 3);

    expect(
      screen.getByText(`${kochCount} jobs match “koch”`)
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(kochCount);
  });

  it("shows Searching… instead of no results until the last batch is read", async () => {
    const requests = recordListRequests();
    renderRoute("/?q=astronaut");

    expect(await screen.findByText("Searching…")).toBeInTheDocument();
    expect(requests).toHaveLength(1);
    expect(screen.queryByText(/No jobs match/)).not.toBeInTheDocument();
    expect(screen.queryByText(/jobs match/)).not.toBeInTheDocument();

    await loadNextBatch(requests, 2);
    expect(screen.getByText("Searching…")).toBeInTheDocument();
    expect(screen.queryByText(/No jobs match/)).not.toBeInTheDocument();

    await loadNextBatch(requests, 3);
    expect(screen.getByText("No jobs match “astronaut”")).toBeInTheDocument();
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();
  });

  it("reads every batch when nothing matches, however many there are", async () => {
    const batchCount = 9;
    serveListWithTotal(JOBS_PAGE_SIZE * batchCount);
    const requests = recordListRequests();
    renderRoute("/?q=astronaut");
    await screen.findByText("Searching…");

    for (let loaded = 2; loaded <= batchCount; loaded += 1) {
      await loadNextBatch(requests, loaded);
    }

    expect(screen.getByText("No jobs match “astronaut”")).toBeInTheDocument();
    expect(requests.map((request) => request.pageNum)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  it("shows only jobs whose title matches, ignoring case and accents", async () => {
    const requests = recordListRequests();
    const { router } = renderRoute("/");
    await screen.findByRole("link", { name: firstTitle });

    await searchFor("KUCHE");
    await screen.findByText(/jobs match “KUCHE”/);
    await loadNextBatch(requests, 2);
    await loadNextBatch(requests, 3);

    expect(screen.getByText(kuecheHeading)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(kuecheCount);
    expect(router.state.location.search).toBe("?q=KUCHE");
  });

  it("writes the query to the URL once, after typing stops", async () => {
    const { router } = renderRoute("/");
    await screen.findByRole("link", { name: firstTitle });
    const searches: string[] = [router.state.location.search];
    router.subscribe((state) => {
      if (searches.at(-1) !== state.location.search) {
        searches.push(state.location.search);
      }
    });

    await userEvent.type(screen.getByRole("searchbox"), "koch");
    expect(router.state.location.search).toBe("");
    await screen.findByText(/jobs match “koch”/);

    expect(searches).toEqual(["", "?q=koch"]);
    expect(router.state.historyAction).toBe("REPLACE");
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
    const requests = recordListRequests();
    renderRoute("/?q=astronaut");
    await screen.findByText("Searching…");
    await loadNextBatch(requests, 2);
    await loadNextBatch(requests, 3);

    await userEvent.click(
      await screen.findByRole("button", { name: "Show all jobs" })
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
        return HttpResponse.json(
          fakeListPage({ ...listParams(request), total: LIST_TOTAL })
        );
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
        return HttpResponse.json(
          fakeListPage({ ...params, total: LIST_TOTAL })
        );
      })
    );
    const requests = recordListRequests();
    renderRoute("/?q=koch");
    await screen.findByText(`${kochInFirstBatch}+ jobs match “koch”`);
    act(() => mockAllIsIntersecting(true));

    expect(
      await screen.findByText("Couldn't load more jobs.")
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(kochInFirstBatch);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(requests).toHaveLength(3));
    await loadNextBatch(requests, 4);

    expect(
      screen.getByText(`${kochCount} jobs match “koch”`)
    ).toBeInTheDocument();
  });
});
