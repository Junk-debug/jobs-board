import { describe, expect, it } from "vitest";
import { formatDate, formatDuration, formatMoney } from "./format";

describe("formatDuration", () => {
  it.each([
    [2880, "48 h"],
    [450, "7 h 30 min"],
    [45, "45 min"],
  ])("formats %i minutes as %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

describe("formatDate", () => {
  it("shows the day in Swiss time whatever the viewer's time zone", () => {
    expect(formatDate(new Date("2026-03-14T23:30:00Z"))).toMatch(/^15 /);
  });
});

describe("formatMoney", () => {
  it("shows the currency when it is known", () => {
    expect(formatMoney({ amount: 47, currency: "CHF" })).toMatch(
      /CHF\s?47\.00/
    );
  });

  it("falls back to a plain number for an unknown currency", () => {
    expect(formatMoney({ amount: 47, currency: null })).toBe("47.00");
  });
});
