# ufc-cal

Live calendar feeds for UFC events—scraped from [ufc.com](https://www.ufc.com) and published as standard `.ics` files.

**Subscribe in the browser:** [n-ochs.github.io/ufc-cal](https://n-ochs.github.io/ufc-cal/) (pick Apple or Google, or copy the URL).

**Subscribe manually** with `webcal` (many calendar apps accept this as a subscription URL):

| Feed | URL |
|------|-----|
| **All UFC events** | `webcal://raw.githubusercontent.com/n-ochs/ufc-cal/ics/UFC.ics` |
| **Numbered events only** (e.g. UFC 327—not Fight Night cards) | `webcal://raw.githubusercontent.com/n-ochs/ufc-cal/ics/UFC-Numbered.ics` |

## What is this?

A calendar feed that adds and updates UFC events as cards are announced or changed on the UFC site. Event descriptions include matchups, weight-class shorthand, title bouts, and main / prelims / early prelims sections when that data exists.

This project is **not affiliated with the UFC**.

## Why use it?

- **Stays current**: the feed is regenerated on a schedule so listings track the site within hours of typical updates.
- **Useful blocks of time**: each calendar entry runs from the **earliest** listed card (early prelims or prelims when present) through **three hours after main-card start**, so the block matches a full fight night.
- **Card detail in the description**: see announced fights and sections without opening a browser.

## Example event

![Example event](./src/assets/ufc-cal-example.png)

## For contributors

**Run locally**

1. Install [Bun](https://bun.sh).
2. Clone the repo and run:

   ```sh
   bun install
   bun run start
   ```

3. That writes `UFC.ics` and `UFC-Numbered.ics` in the current directory.

The scraper validates payloads with **Zod** and builds ICS with the `ics` package.

**Automated updates**

On the `ics` branch, a GitHub Action runs **every four hours**: it checks out that branch, runs `bun install --frozen-lockfile` and `bun run start`, then commits updated `.ics` files when they change.

## Credits

Fork maintained by **[n-ochs](https://github.com/n-ochs)** — [github.com/n-ochs/ufc-cal](https://github.com/n-ochs/ufc-cal).

Original project by **Clarence Chan**: [github.com/clarencechaan/ufc-cal](https://github.com/clarencechaan/ufc-cal).

License: **ISC** (see upstream `package.json`).
