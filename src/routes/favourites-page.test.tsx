import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useFavouritesStore } from "@/stores/favourites.store";
import { renderRoute } from "@/test/render-route";
import { fixtures } from "@/test/server";

const job = fixtures.jobDetails.data;
const UNKNOWN_JOB_ID = "00000000-0000-4000-8000-000000000000";

describe("Favourites page", () => {
  it("shows an empty state when nothing is saved", async () => {
    renderRoute("/favourites");

    expect(await screen.findByText("No saved jobs yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse jobs" })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("lists saved jobs and counts them in the header", async () => {
    useFavouritesStore.setState({ ids: [job.workAssignmentId] });

    renderRoute("/favourites");

    expect(
      await screen.findByRole("link", { name: job.workAssignmentName })
    ).toHaveAttribute("href", `/job/${job.workAssignmentId}`);
    expect(screen.getByText("1 job")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Saved jobs: 1" })
    ).toBeInTheDocument();
  });

  it("lets you remove a job that is no longer available", async () => {
    useFavouritesStore.setState({ ids: [UNKNOWN_JOB_ID] });

    renderRoute("/favourites");

    expect(
      await screen.findByText("This job is no longer available.")
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("No saved jobs yet")).toBeInTheDocument();
  });
});
