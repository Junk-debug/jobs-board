import { describe, expect, it } from "vitest";
import { matchesTitle } from "./search";

describe("matchesTitle", () => {
  it("ignores case", () => {
    expect(matchesTitle("Service Aushilfe", "service AUSHILFE")).toBe(true);
  });

  it("matches part of a word", () => {
    expect(matchesTitle("Kassierer*in Damenkonfektion", "kassier")).toBe(true);
  });

  it("ignores accents on both sides", () => {
    expect(matchesTitle("Koch6 | Küche", "kuche")).toBe(true);
    expect(matchesTitle("Kuchenhilfe", "küchen")).toBe(true);
    expect(matchesTitle("à la carte", "a la carte")).toBe(true);
  });

  it("ignores spaces around the query", () => {
    expect(matchesTitle("Chef de Partie", "  partie ")).toBe(true);
  });

  it("matches the words in the order they are typed", () => {
    expect(matchesTitle("Chef de Partie", "chef partie")).toBe(false);
  });

  it("never matches a job without a title", () => {
    expect(matchesTitle(null, "koch")).toBe(false);
  });
});
