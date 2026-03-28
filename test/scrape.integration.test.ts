import { describe, expect, it } from "vitest";
import { getDetailsFromEventURL, getEventURLs } from "../src/scrape.js";

describe("UFC.com live scrape", () => {
  it("discovers event URLs from the public listings", async () => {
    const urls = await getEventURLs();

    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) {
      expect(u.hostname).toBe("www.ufc.com");
      expect(u.pathname.length).toBeGreaterThan(1);
    }
  });

  it("parses a real event page into a structured UFCEvent", async () => {
    const urls = await getEventURLs();
    expect(urls.length).toBeGreaterThan(0);
    const firstUrl = urls[0];
    if (firstUrl === undefined) throw new Error("expected at least one event URL");

    const event = await getDetailsFromEventURL(firstUrl);

    expect(event.name.length).toBeGreaterThan(0);
    expect(event.date.length).toBeGreaterThan(0);
    expect(Number.isFinite(Number.parseInt(event.date, 10))).toBe(true);
    expect(event.location.length).toBeGreaterThan(0);
    expect(event.url.href).toBe(firstUrl.href);

    const lists = [
      event.fightCard,
      event.mainCard,
      event.prelims,
      event.earlyPrelims,
    ];
    const totalFights = lists.reduce((n, a) => n + a.length, 0);
    expect(totalFights).toBeGreaterThan(0);
  });
});
