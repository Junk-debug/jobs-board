import { describe, expect, it } from "vitest";
import { formatDuration, formatMoney } from "./format";

describe("formatDuration", () => {
  it.each([
    [2880, "48 h"],
    [450, "7 h 30 min"],
    [45, "45 min"],
  ])("formats %i minutes as %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
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
