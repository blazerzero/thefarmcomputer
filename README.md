# The Farm Computer

A nifty Discord bot and web app that provide real-time Stardew Valley game data lookups, powered by Cloudflare Workers. It scrapes the [Stardew Valley Wiki](https://stardewvalleywiki.com) and stores data in a SQLite database (via Cloudflare Durable Objects), refreshing automatically on the 1st of every month at 8 AM UTC.

## Commands

| Command | Description |
|---------|-------------|
| `/artisan <name>` | Look up an artisan good — machine, ingredients, energy/health, sell prices by quality, and Cask aging times |
| `/book <name>` | Look up a book — description, effect on subsequent readings, and where to find it |
| `/bundle <name>` | Look up a Community Center bundle — required items, quantities, and reward |
| `/craft <name>` | Look up a crafted item — ingredients, recipe source, duration, and stats |
| `/deconstruct <name>` | Look up what the Deconstructor yields from an item — sell price and recovered materials |
| `/crop <name>` | Look up a crop — seasons, growth time, seed price, and sell prices by quality |
| `/fish <name>` | Look up a fish — category, location, seasons, weather, difficulty, and sell prices by quality |
| `/footwear <name>` | Look up a piece of footwear — stats, source, purchase price, and sell price |
| `/forage <name>` | Look up a forageable item — seasons, found locations, energy/health by quality, and sell prices by quality |
| `/fruit <name>` | Look up a fruit item — source, seasons, energy/health by quality, and sell prices by quality |
| `/fruit-tree <name>` | Look up a fruit tree — harvest season, growth time, sapling price, and sell prices by quality |
| `/gift <villager> [tier]` | Look up a villager's gift preferences (loved, liked, neutral, disliked, hated) and birthday |
| `/ingredient <name>` | Find all crafting recipes that use the given item as an ingredient |
| `/mineral <name>` | Look up a mineral — category, sell price, Gemologist sell price, source, and uses |
| `/monster <name>` | Look up a monster — location, HP, damage, defense, speed, XP, and drops |
| `/recipe <name>` | Look up a cooked food recipe — ingredients, energy/health, buffs, and sell price |
| `/ring <name>` | Look up a ring — effects, sell price, and where to find it |
| `/schedule <villager> [season] [day]` | Look up a villager's daily schedule, optionally filtered by season and occasion |
| `/season <season>` | List all crops harvestable in Spring, Summer, Fall, or Winter |
| `/tool <name>` | Look up a tool — type, cost, ingredients, improvements, and location |
| `/weapon <name>` | Look up a weapon — type, level, damage, stats, location, and price |
| `/info` | Show the bot's data freshness and record counts |

## Web App

The web app provides a browser-based interface to the same data as the Discord bot. Pick a command (e.g. `crop` or `gift`), fill out the provided fields, and get back the same formatted results, rendered as Discord-style embed cards.

An "Add to Discord" button is also available to install the bot directly from the web.

## Setup

### Prerequisites

- [Node 24](https://nodejs.org/) (Node 25+ not yet verified)
- [Yarn](https://yarnpkg.com/)
- A [Cloudflare account](https://dash.cloudflare.com/) with Workers enabled
- A Discord application with a bot token

### Install Dependencies

```bash
yarn install
```

### Configure Environment

Create a `.env` file in the project root:

```env
DISCORD_APPLICATION_ID=your_app_id
DISCORD_TOKEN=your_bot_token
DISCORD_PUBLIC_KEY=your_public_key
BOT_OWNER_TOKEN=your_admin_token
VITE_DEPLOY_URL=your_web_deploy_url
VITE_OG_IMAGE_URL=your_web_og_image
```

### Register Discord Commands

```bash
yarn register-manual
```

Global commands can take a few minutes to propagate on Discord.

### Local Development

Run the Cloudflare Worker backend:

```bash
yarn dev
```

To also run the web frontend (in a separate terminal):

```bash
yarn web:dev
```

The web app runs at `http://localhost:5173` and proxies API requests to the Worker at `http://localhost:8787`.

To bypass Discord signature verification during local development, add the following to your `.dev.vars`:

```env
OVERRIDE_DISCORD_AUTH=true
```

### Deploy

```bash
yarn deploy
```

The web frontend is built and served as a Cloudflare static asset bundle. To build it before deploying:

```bash
yarn web:build
```

## Architecture

- **Cloudflare Workers** — serverless request handling and Discord interaction verification
- **Durable Objects + SQLite** — persistent storage for crop, fish, forageable, mineral, villager, bundle, and fruit tree data
- **Wiki scraper** — fetches and parses data from stardewvalleywiki.com on startup and weekly via cron
- **Web frontend** — React + Vite app served as a Cloudflare static asset bundle; queries the same Worker backend via `/api/query`

## License

MIT © 2026 Omeed Habibelahian
