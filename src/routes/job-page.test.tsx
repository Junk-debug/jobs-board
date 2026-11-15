import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/render-route";
import { fixtures, JOB_DETAILS_URL, server } from "@/test/server";

const job = fixtures.jobDetails.data;

describe("Job page", () => {
  it("opens directly from a link", async () => {
    renderRoute(`/job/${job.workAssignmentId}`);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: job.workAssignmentName,
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Total working time")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Apply on Coople/ })
    ).toHaveAttribute("href", job.branchLink);
  });

  it("shows not found for an id that is not a UUID without calling the API", async () => {
    let calls = 0;
    server.use(
      http.get(JOB_DETAILS_URL, () => {
        calls += 1;
        return HttpResponse.json(fixtures.jobDetails);
      })
    );

    renderRoute("/job/60261070511");

    expect(
      await screen.findByText("Not found", { exact: true })
    ).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it("shows an error and recovers on retry", async () => {
    let isCoopleDown = true;
    server.use(
      http.get(JOB_DETAILS_URL, () =>
        isCoopleDown
          ? new HttpResponse(null, { status: 503 })
          : HttpResponse.json(fixtures.jobDetails)
      )
    );

    renderRoute(`/job/${job.workAssignmentId}`);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Something went wrong")).toBeInTheDocument();

    isCoopleDown = false;
    await userEvent.click(
      within(alert).getByRole("button", { name: "Try again" })
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: job.workAssignmentName,
      })
    ).toBeInTheDocument();
  });

  it("shows not found for an unknown job", async () => {
    renderRoute("/job/00000000-0000-4000-8000-000000000000");

    expect(
      await screen.findByText("Not found", { exact: true })
    ).toBeInTheDocument();
  });
});
