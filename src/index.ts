import { handleCrop } from "./commands/crop";
import { handleGift } from "./commands/gift";
import { countCrops, countVillagers, initDb, upsertCrop, upsertVillager } from "./db";
import { scrapeCrops } from "./scraper/crops";
import { scrapeVillagers } from "./scraper/villagers";
import { type Env, InteractionResponseType, InteractionType } from "./types";
import { verifyDiscordRequest } from "./verify";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Timestamp for next Sunday at midnight UTC. */
function nextSundayMidnight(): number {
  const now = new Date();
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntilSunday);
  next.setUTCHours(0, 0, 0, 0);
  return next.getTime();
}

async function refreshCrops(sql: SqlStorage): Promise<number> {
  const crops = await scrapeCrops();
  for (const crop of crops) upsertCrop(sql, crop);
  return crops.length;
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
    const villagers = await scrapeVillagers();
    for (const v of villagers) upsertVillager(sql, v);
    console.log(`Updated ${villagers.length} villagers`);
  } catch (err) {
    console.error("Villager scrape failed:", err);
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

    // Schedule the first alarm and seed the DB if this is a brand-new instance
    state.blockConcurrencyWhile(async () => {
      const existing = await state.storage.getAlarm();
      if (existing === null) {
        await state.storage.setAlarm(nextSundayMidnight());
      }
      if (countCrops(this.sql) === 0 && countVillagers(this.sql) === 0) {
        await refreshAll(this.sql);
      }
    });
  }

  // Called by the DO runtime when the scheduled alarm fires
  async alarm(): Promise<void> {
    await refreshAll(this.sql);
    await this.state.storage.setAlarm(nextSundayMidnight());
  }

  // Receives forwarded Discord interaction requests from the thin Worker
  async fetch(request: Request): Promise<Response> {
    const body = await request.text();
    const interaction = JSON.parse(body) as Record<string, unknown>;
    const type = interaction.type as number;

    if (type === InteractionType.PING) {
      return Response.json({ type: InteractionResponseType.PONG });
    }

    if (type === InteractionType.APPLICATION_COMMAND) {
      const commandName = (interaction.data as Record<string, unknown>)?.name as string;

      if (commandName === "crop") return handleCrop(interaction, this.sql);
      if (commandName === "gift") return handleGift(interaction, this.sql);

      if (commandName === "update") {
        this.state.waitUntil(
          refreshCrops(this.sql)
            .then((n) => console.log(`/update: refreshed ${n} crops`))
            .catch(console.error),
        );
        return Response.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Refreshing crop data from the Stardew Valley Wiki…",
            flags: 64,
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
} satisfies ExportedHandler<Env>;
