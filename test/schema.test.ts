import { describe, expect, it } from "vitest";
import { ufcEventSchema } from "../src/schema.js";

const validMinimal = {
  name: "UFC Fight Night: Example",
  url: new URL("https://www.ufc.com/event/example"),
  date: "1700000000",
  location: "Some Arena",
  fightCard: [] as string[],
  mainCard: [] as string[],
  prelims: [] as string[],
  earlyPrelims: [] as string[],
};

describe("ufcEventSchema", () => {
  it("parses a complete valid event", () => {
    const parsed = ufcEventSchema.parse({
      ...validMinimal,
      prelimsTime: "1700003600",
      earlyPrelimsTime: "1699996400",
    });
    expect(parsed.name).toBe(validMinimal.name);
    expect(parsed.url.href).toBe(validMinimal.url.href);
    expect(parsed.prelimsTime).toBe("1700003600");
  });

  it("rejects an empty name", () => {
    expect(() =>
      ufcEventSchema.parse({ ...validMinimal, name: "" })
    ).toThrow();
  });

  it("rejects a non-URL url field", () => {
    expect(() =>
      ufcEventSchema.parse({
        ...validMinimal,
        url: "https://www.ufc.com/event/example" as unknown as URL,
      })
    ).toThrow();
  });

  it("rejects an empty date timestamp string", () => {
    expect(() =>
      ufcEventSchema.parse({ ...validMinimal, date: "" })
    ).toThrow();
  });
});
