import { getAllDetailedEvents } from "./scrape.js";
import * as fs from "fs";
import { createEvents, type EventAttributes } from "ics";
import {
  buildEventDescription,
  getCalendarStartEnd,
  toDateArray,
} from "./event-calendar.js";
import type { UFCEvent } from "./schema.js";

/**
 * Extracts the details of recent and upcoming UFC events, then creates an
 * ICS file named "UFC.ics" in the current directory containing these events
 */
async function createICS() {
  try {
    const events = await getAllDetailedEvents();
    if (!events?.length) throw new Error("No events retrieved");

    const formattedEvents = events.map((event) =>
      formatEventForCalendar(event, "UFC")
    );

    console.log("\nDetailed events:");
    console.log(formattedEvents);

    const eventsData = createEvents(formattedEvents).value;
    if (eventsData) fs.writeFileSync("UFC.ics", eventsData);

    /** Numbered events (e.g. UFC 300), excluding Fight Night cards. */
    const numberedEvents = events.filter(
      (event) => !event.name.includes("Fight Night")
    );
    const formattedNumberedEvents = numberedEvents.map((event) =>
      formatEventForCalendar(event, "UFC-Numbered")
    );

    const numberedEventsData = createEvents(formattedNumberedEvents).value;
    if (numberedEventsData) fs.writeFileSync("UFC-Numbered.ics", numberedEventsData);
  } catch (error) {
    console.error(error);
  }
}

function formatEventForCalendar(
  event: UFCEvent,
  calName = "UFC"
): EventAttributes {
  const { start, end } = getCalendarStartEnd(event);
  const startArr = toDateArray(start);
  const endArr = toDateArray(end);

  const title = event.name;

  const accurateAsOf = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });

  const description = buildEventDescription(event, accurateAsOf);
  const location = event.location;
  const uid = event.url.href;

  return {
    start: startArr,
    end: endArr,
    title,
    description,
    location,
    uid,
    calName,
  };
}

createICS();
