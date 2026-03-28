import type { UFCEvent } from "./schema.js";

function parseEpochMs(seconds: string): number {
  return parseInt(seconds, 10) * 1000;
}

/** Calendar block: start at first broadcast segment, end main start + 3h. */
export function getCalendarStartEnd(event: UFCEvent): {
  start: Date;
  end: Date;
} {
  const mainMs = parseEpochMs(event.date);
  const mainStart = new Date(mainMs);
  const end = new Date(mainMs + 3 * 60 * 60 * 1000);

  if (event.fightCard.length > 0) {
    return { start: mainStart, end };
  }

  const candidates: number[] = [];
  if (event.earlyPrelims.length > 0 && event.earlyPrelimsTime) {
    candidates.push(parseEpochMs(event.earlyPrelimsTime));
  }
  if (event.prelims.length > 0 && event.prelimsTime) {
    candidates.push(parseEpochMs(event.prelimsTime));
  }
  if (event.mainCard.length > 0) {
    candidates.push(mainMs);
  }

  const start =
    candidates.length > 0 ? new Date(Math.min(...candidates)) : mainStart;

  return { start, end };
}

const SECTION_RULE = "------------------";

const DISPLAY_TZ = "America/New_York";

function formatCardStartLabel(epochSeconds: string): string {
  return new Date(parseInt(epochSeconds, 10) * 1000).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: DISPLAY_TZ,
    timeZoneName: "short",
  });
}

function hoursBeforeMainLabel(sectionMs: number, mainMs: number): string {
  const hours = (mainMs - sectionMs) / (1000 * 60 * 60);
  if (hours <= 0) return "";
  const rounded =
    Math.abs(hours - Math.round(hours)) < 0.05
      ? Math.round(hours)
      : Math.round(hours * 10) / 10;
  return ` (${rounded} hrs before Main)`;
}

function sectionTitle(
  label: string,
  epochSeconds: string | undefined,
  mainMs: number
): string {
  if (!epochSeconds) return label;
  const when = formatCardStartLabel(epochSeconds);
  const rel = hoursBeforeMainLabel(parseEpochMs(epochSeconds), mainMs);
  return `${label} — ${when}${rel}`;
}

export function buildEventDescription(
  event: UFCEvent,
  accurateAsOf: string
): string {
  const mainMs = parseEpochMs(event.date);
  const parts: string[] = [];

  if (event.mainCard.length > 0) {
    if (event.earlyPrelims.length > 0) {
      parts.push(
        sectionTitle("Early Prelims", event.earlyPrelimsTime, mainMs),
        SECTION_RULE,
        ...event.earlyPrelims,
        ""
      );
    }
    if (event.prelims.length > 0) {
      parts.push(
        sectionTitle("Prelims", event.prelimsTime, mainMs),
        SECTION_RULE,
        ...event.prelims,
        ""
      );
    }
    parts.push(
      sectionTitle("Main Card", event.date, mainMs),
      SECTION_RULE,
      ...event.mainCard
    );
  } else if (event.fightCard.length > 0) {
    parts.push(...event.fightCard);
  }

  let body = parts.join("\n").trimEnd();
  if (body.length > 0) body += "\n\n";
  body += `${event.url.href}\n\nAccurate as of ${accurateAsOf}`;

  return body;
}

export function toDateArray(d: Date): [number, number, number, number, number] {
  return [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
  ];
}
