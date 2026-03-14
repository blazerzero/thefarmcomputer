import { handleCrop } from "./commands/crop";
import { handleFish } from "./commands/fish";
import { handleFruitTree } from "./commands/fruitTree";
import { handleGift } from "./commands/gift";
import { handleSeason } from "./commands/season";
import { formatDate } from "./constants";
import {
  countCrops,
  countFish,
  countFruitTrees,
  countVillagers,
  getStatus,
  initDb,
  upsertCrop,
  upsertFish,
  upsertFruitTree,
  upsertVillager,
} from "./db";
import { scrapeCrops } from "./scraper/crops";
import { scrapeFish } from "./scraper/fish";
import { scrapeFruitTrees } from "./scraper/fruitTrees";
import { scrapeVillagers } from "./scraper/villagers";
import { type Env, InteractionResponseType, InteractionType } from "./types";
import { verifyDiscordRequest } from "./verify";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function refreshCrops(sql: SqlStorage): Promise<number> {
  const crops = await scrapeCrops();
  for (const crop of crops) upsertCrop(sql, crop);
  return crops.length;
}

async function refreshFruitTrees(sql: SqlStorage): Promise<number> {
  const trees = await scrapeFruitTrees();
  for (const tree of trees) upsertFruitTree(sql, tree);
  return trees.length;
}

async function refreshFish(sql: SqlStorage): Promise<number> {
  const fishList = await scrapeFish();
  for (const f of fishList) upsertFish(sql, f);
  return fishList.length;
}

async function refreshAll(sql: SqlStorage): Promise<void> {
  console.log("Wiki refresh starting…");
  try {
    const n = await refreshCrops(sql);
    console.log(`Updated ${n} crops`);
  } catch (err) {
    console.error("Crop scrape failed:", err);
  }
  try {
    const n = await refreshFruitTrees(sql);
    console.log(`Updated ${n} fruit trees`);
  } catch (err) {
    console.error("Fruit tree scrape failed:", err);
  }
  try {
    const villagers = await scrapeVillagers();
    for (const v of villagers) upsertVillager(sql, v);
    console.log(`Updated ${villagers.length} villagers`);
  } catch (err) {
    console.error("Villager scrape failed:", err);
  }
  try {
    const n = await refreshFish(sql);
    console.log(`Updated ${n} fish`);
  } catch (err) {
    console.error("Fish scrape failed:", err);
  }
  console.log("Wiki refresh complete");
}

// ── Durable Object ────────────────────────────────────────────────────────────

export class StardewDO implements DurableObject {
  private sql: SqlStorage;

  constructor(private state: DurableObjectState, _env: Env) {
    this.sql = state.storage.sql;

    // Create tables on first boot (safe to call repeatedly — IF NOT EXISTS)
    initDb(this.sql);

    // Seed the DB if this is a brand-new instance
    state.blockConcurrencyWhile(async () => {
      if (countCrops(this.sql) === 0 && countVillagers(this.sql) === 0 && countFruitTrees(this.sql) === 0) {
        await refreshAll(this.sql);
      } else if (countFish(this.sql) === 0) {
        // Fish table was added in a later deploy — populate without full refresh
        await refreshFish(this.sql);
      }
    });
  }

  // Receives forwarded requests from the thin Worker
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/admin/refresh" && request.method === "POST") {
      this.state.waitUntil(refreshAll(this.sql));
      return Response.json({ ok: true });
    }

    const body = await request.text();
    const interaction = JSON.parse(body) as Record<string, unknown>;
    const type = interaction.type as number;

    if (type === InteractionType.PING) {
      return Response.json({ type: InteractionResponseType.PONG });
    }

    if (type === InteractionType.APPLICATION_COMMAND) {
      const commandName = (interaction.data as Record<string, unknown>)?.name as string;

      if (commandName === "crop") return handleCrop(interaction, this.sql);
      if (commandName === "fish") return handleFish(interaction, this.sql);
      if (commandName === "fruit-tree") return handleFruitTree(interaction, this.sql);
      if (commandName === "gift") return handleGift(interaction, this.sql);
      if (commandName === "season") return handleSeason(interaction, this.sql);

      if (commandName === "info") {
        const s = getStatus(this.sql);
        const fmt = (ts: string | null) => (ts ? formatDate(ts) : "never");
        return Response.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [
              {
                title: "The Farm Computer — Status",
                color: 0x5b8a3c,
                fields: [
                  {
                    name: "Crops",
                    value: `${s.cropCount} in database\nLast updated: ${fmt(s.cropsLastUpdated)}`,
                    inline: true,
                  },
                  {
                    name: "Fruit Trees",
                    value: `${s.fruitTreeCount} in database\nLast updated: ${fmt(s.fruitTreesLastUpdated)}`,
                    inline: true,
                  },
                  {
                    name: "Fish",
                    value: `${s.fishCount} in database\nLast updated: ${fmt(s.fishLastUpdated)}`,
                    inline: true,
                  },
                  {
                    name: "Villagers",
                    value: `${s.villagerCount} in database\nLast updated: ${fmt(s.villagersLastUpdated)}`,
                    inline: true,
                  },
                ],
                footer: { text: "Wiki data refreshes every Sunday at 8 AM UTC" },
              },
            ],
          },
        });
      }
    }

    return new Response("Unknown interaction", { status: 400 });
  }
}

// ── Thin Worker (verifies signature, routes to DO) ────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/admin/refresh" && request.method === "POST") {
      const auth = request.headers.get("Authorization");
      if (auth !== `Bearer ${env.BOT_OWNER_TOKEN}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      const stub = env.STARDEW_DO.get(env.STARDEW_DO.idFromName("primary"));
      return stub.fetch(new Request(request.url, { method: "POST", headers: request.headers }));
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const body = await request.text();
    const signature = request.headers.get("X-Signature-Ed25519") ?? "";
    const timestamp  = request.headers.get("X-Signature-Timestamp") ?? "";

    const valid = await verifyDiscordRequest(env.DISCORD_PUBLIC_KEY, signature, timestamp, body);
    if (!valid) return new Response("Unauthorized", { status: 401 });

    const stub = env.STARDEW_DO.get(env.STARDEW_DO.idFromName("primary"));
    return stub.fetch(new Request(request.url, { method: "POST", body }));
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const stub = env.STARDEW_DO.get(env.STARDEW_DO.idFromName("primary"));
    ctx.waitUntil(
      stub.fetch(
        new Request("https://internal/admin/refresh", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.BOT_OWNER_TOKEN}` },
        }),
      ),
    );
  },
} satisfies ExportedHandler<Env>;
