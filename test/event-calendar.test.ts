import { describe, expect, it } from "vitest";
import {
  buildEventDescription,
  getCalendarStartEnd,
  toDateArray,
} from "../src/event-calendar.js";
import type { UFCEvent } from "../src/schema.js";

function sampleEvent(overrides: Partial<UFCEvent> = {}): UFCEvent {
  return {
    name: "UFC 300: Sample Card",
    url: new URL("https://www.ufc.com/event/ufc-300"),
    date: "1713490800",
    location: "Las Vegas Nevada United States",
    fightCard: [],
    mainCard: ["Fighter A vs. Fighter B @155"],
    prelims: ["Fighter C vs. Fighter D @135"],
    earlyPrelims: [],
    ...overrides,
  };
}

describe("getCalendarStartEnd", () => {
  it("uses main card time for full announced card and ends three hours later", () => {
    const event = sampleEvent();
    const mainMs = Number.parseInt(event.date, 10) * 1000;
    const { start, end } = getCalendarStartEnd(event);

    expect(start.getTime()).toBe(mainMs);
    expect(end.getTime()).toBe(mainMs + 3 * 60 * 60 * 1000);
  });

  it("uses earliest segment when main segments exist but fight card is not yet merged", () => {
    const early = "1713480000";
    const prelims = "1713487200";
    const main = "1713490800";
    const event = sampleEvent({
      fightCard: [],
      mainCard: ["Main A vs. Main B @205"],
      prelims: ["Prelim A vs. Prelim B @155"],
      earlyPrelims: ["Early A vs. Early B @135"],
      date: main,
      prelimsTime: prelims,
      earlyPrelimsTime: early,
    });

    const { start, end } = getCalendarStartEnd(event);
    const mainMs = Number.parseInt(main, 10) * 1000;

    expect(start.getTime()).toBe(Number.parseInt(early, 10) * 1000);
    expect(end.getTime()).toBe(mainMs + 3 * 60 * 60 * 1000);
  });

  it("falls back to main time when only a flat fight card exists", () => {
    const main = "1713490800";
    const event = sampleEvent({
      date: main,
      fightCard: ["A vs. B @185"],
      mainCard: [],
      prelims: [],
      earlyPrelims: [],
    });

    const mainMs = Number.parseInt(main, 10) * 1000;
    const { start, end } = getCalendarStartEnd(event);

    expect(start.getTime()).toBe(mainMs);
    expect(end.getTime()).toBe(mainMs + 3 * 60 * 60 * 1000);
  });
});

describe("buildEventDescription", () => {
  it("includes sections, fight lines, event URL, and accurate-as-of footer", () => {
    const event = sampleEvent({
      earlyPrelims: ["Early vs. Early @135"],
      earlyPrelimsTime: "1713480000",
      prelimsTime: "1713487200",
    });
    const desc = buildEventDescription(event, "Mar 1, 2025, 12:00 PM EST");

    expect(desc).toContain("Early Prelims");
    expect(desc).toContain("------------------");
    expect(desc).toContain("Early vs. Early @135");
    expect(desc).toContain("Prelims");
    expect(desc).toContain("Fighter C vs. Fighter D @135");
    expect(desc).toContain("Main Card");
    expect(desc).toContain("Fighter A vs. Fighter B @155");
    expect(desc).toContain(event.url.href);
    expect(desc).toContain("Accurate as of Mar 1, 2025, 12:00 PM EST");
  });

  it("outputs only the flat fight card when main card is empty", () => {
    const event = sampleEvent({
      mainCard: [],
      prelims: [],
      earlyPrelims: [],
      fightCard: ["Catchweight bout vs. bout @CW"],
    });
    const desc = buildEventDescription(event, "Jan 1, 2025");

    expect(desc.startsWith("Catchweight bout vs. bout @CW")).toBe(true);
    expect(desc).toContain(event.url.href);
  });
});

describe("toDateArray", () => {
  it("returns [year, month, day, hour, minute] in local time", () => {
    const d = new Date(2026, 2, 28, 14, 7, 0, 0);
    expect(toDateArray(d)).toEqual([2026, 3, 28, 14, 7]);
  });
});
