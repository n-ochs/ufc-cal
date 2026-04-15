import { parse, HTMLElement } from "node-html-parser";
import { decode } from "html-entities";
import { ufcEventSchema } from "./schema.js";
import { Logger } from "./logger.js";

const log = new Logger("scrape");

/**
 * Returns an array of URLs of recent and upcoming UFC events
 */
async function getEventURLs() {
  // Get first two pages of event urls
  const pageURLs = [
    new URL("https://www.ufc.com/events?page=0"),
    new URL("https://www.ufc.com/events?page=1"),
  ];

  try {
    const eventURLs = (
      await Promise.all(pageURLs.map(getEventURLsFromPageURL))
    ).flat();

    log.info("Event URLs found", {
      urls: eventURLs.map((url) => url.href),
    });
    return eventURLs;
  } catch (error) {
    log.error("getEventURLs failed", error);
    throw new Error("Failed to retrieve event URLs");
  }
}

async function getEventURLsFromPageURL(url: URL) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const root = parse(text);

    // Extract the URLs of the relevant events from the HTML element
    const eventURLElements = root.querySelectorAll(
      ".c-card-event--result__headline"
    );
    const eventURLs = eventURLElements.map(
      (html) =>
        new URL(
          `https://www.ufc.com${(html.firstChild as HTMLElement).getAttribute(
            "href"
          )}`
        )
    );

    return eventURLs;
  } catch (error) {
    log.error("getEventURLsFromPageURL failed", error, { url: url.href });
    throw new Error("Failed to retrieve event URLs from page URL");
  }
}

/**
 * Returns the output string of a fight given its HTML element list item
 */
function convertLiToStr(li: HTMLElement) {
  const bout = li.querySelector(".c-listing-fight__class-text")?.textContent;

  let fightStr = "";

  // Return only fight names without bout weightclass if formatting for
  // an event is broken on the UFC event page
  if (!bout) {
    const textContent = li
      .querySelector(".field--name-node-title")
      ?.textContent?.trim()
      .replace(" vs ", " vs. ");
    if (!textContent) return "";
    fightStr += textContent;
    return decode(fightStr);
  }

  const isTitleFight = /\btitle bout\b/i.test(bout);

  let weightClass = "";

  // Get weightclass in short form
  if (bout.includes("Strawweight")) weightClass = "115";
  else if (bout.includes("Flyweight")) weightClass = "125";
  else if (bout.includes("Bantamweight")) weightClass = "135";
  else if (bout.includes("Featherweight")) weightClass = "145";
  else if (bout.includes("Lightweight")) weightClass = "155";
  else if (bout.includes("Welterweight")) weightClass = "170";
  else if (bout.includes("Middleweight")) weightClass = "185";
  else if (bout.includes("Light Heavyweight")) weightClass = "205";
  else if (bout.includes("Heavyweight")) weightClass = "265";
  else if (bout.includes("Catchweight")) weightClass = "CW";

  // Extract and format fighter names with weightclass
  const red =
    li
      .querySelector(".c-listing-fight__corner-name--red")
      ?.textContent?.replaceAll("\n", "")
      .replace(/\s+/g, " ")
      .trim() || "___";
  const blue =
    li
      .querySelector(".c-listing-fight__corner-name--blue")
      ?.textContent?.replaceAll("\n", "")
      .replace(/\s+/g, " ")
      .trim() || "___";

  const ranks = li
    .querySelectorAll(
      ".js-listing-fight__corner-rank.c-listing-fight__corner-rank"
    )
    .map((rank) => rank?.textContent.trim());

  const redRankStr = ranks[0] ? ` (${ranks[0]})` : "";
  const blueRankStr = ranks[1] ? ` (${ranks[1]})` : "";
  const titleTag = isTitleFight ? "🏆 " : "";
  fightStr += `${titleTag}${red}${redRankStr} vs. ${blue}${blueRankStr} @${weightClass}`;

  fightStr = decode(fightStr);

  return fightStr;
}

/**
 * Returns the fight card details of a UFC event given its URL
 */
async function getDetailsFromEventURL(url: URL) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const root = parse(text);

    // Extract basic details of the event from the HTML
    const headlinePrefix = root
      .querySelector(".c-hero__headline-prefix")
      ?.innerText.trim();
    const headline = root
      .querySelector(".c-hero__headline")
      ?.innerText.replace(/\s\s+/g, " ")
      .trim();
    const date = root
      .querySelector(".c-hero__headline-suffix")
      ?.getAttribute("data-timestamp");

    const prelimsTime = root
      .querySelector("#prelims-card .c-event-fight-card-broadcaster__time")
      ?.getAttribute("data-timestamp");
    const earlyPrelimsTime = root
      .querySelector("#early-prelims .c-event-fight-card-broadcaster__time")
      ?.getAttribute("data-timestamp");

    let name = `${headlinePrefix}: ${headline}`;
    let location =
      root
        .querySelector(".field--name-venue")
        ?.innerText.replaceAll(",", "")
        .split("\n")
        .filter((str) => str)
        .map((str) => str.trim())
        .join(", ") || "";
    let fightCard: string[] = [];
    let mainCard: string[] = [];
    let prelims: string[] = [];
    let earlyPrelims: string[] = [];

    log.info("Getting event details", { url: url.href });

    const mainCardElements = root.querySelectorAll(
      "#main-card .l-listing__item"
    );
    // Check if main card and prelims have been announced
    if (mainCardElements.length) {
      // Main card has been announced, extract prelims
      const prelimsElements = root.querySelectorAll(
        "#prelims-card .l-listing__item"
      );
      const earlyPrelimsElements = root.querySelectorAll(
        "#early-prelims .l-listing__item"
      );

      mainCard = mainCardElements.map(convertLiToStr);
      prelims = prelimsElements.map(convertLiToStr);
      earlyPrelims = earlyPrelimsElements.map(convertLiToStr);

      log.debug("Parsed card sections", {
        mainCard: mainCard.length,
        prelims: prelims.length,
      });
    } else {
      // Main card has not been announced, extract entire fight card
      const fightCardElements = root.querySelectorAll(
        ".l-listing__group--bordered .l-listing__item"
      );

      fightCard = fightCardElements.map(convertLiToStr);

      log.debug("Parsed fight card (no main/prelims split)", {
        fightCard: fightCard.length,
      });
    }

    // Deentitize HTML entities
    [name, location] = [decode(name), decode(location)];

    if (!name || !date) {
      throw new Error("Failed to retrieve event details");
    }

    const details = ufcEventSchema.parse({
      name,
      url,
      date,
      location,
      fightCard,
      mainCard,
      prelims,
      earlyPrelims,
      prelimsTime: prelimsTime || undefined,
      earlyPrelimsTime: earlyPrelimsTime || undefined,
    });
    return details;
  } catch (error) {
    log.error("getDetailsFromEventURL failed", error, { url: url.href });
    throw new Error(`Failed to retrieve event: ${url.href}\n${error}`);
  }
}

/**
 * Returns an array of details of recent and upcoming UFC events
 */
async function getAllDetailedEvents() {
  try {
    const eventURLs = await getEventURLs();
    const urls = eventURLs ?? [];

    const settled = await Promise.allSettled(
      urls.map((url) => getDetailsFromEventURL(url))
    );

    const detailedEvents = [];
    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      if (result.status === "fulfilled") {
        detailedEvents.push(result.value);
      } else {
        log.error("Skipping event page that failed to parse", {
          url: urls[i]?.href,
          reason: result.reason,
        });
      }
    }

    if (!detailedEvents.length) {
      throw new Error("Failed to retrieve any events");
    }

    return detailedEvents;
  } catch (error) {
    log.error("getAllDetailedEvents failed", error);
    throw new Error("Failed to retrieve all events");
  }
}

export { getAllDetailedEvents, getDetailsFromEventURL, getEventURLs };
