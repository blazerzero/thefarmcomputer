import { verifyDiscordRequest } from "./verify.js";
import { handleCrop } from "./commands/crop.js";
import { handleGift } from "./commands/gift.js";
import { countCrops, countVillagers, upsertCrop, upsertVillager } from "./db.js";
import { scrapeCrops } from "./scraper/crops.js";
import { scrapeVillagers } from "./scraper/villagers.js";
import { InteractionResponseType, InteractionType } from "./types.js";
import type { Env } from "./types.js";

// ── Scraper helpers ───────────────────────────────────────────────────────────

async function refreshCrops(env: Env): Promise<number> {
  const crops = await scrapeCrops();
  for (const crop of crops) await upsertCrop(env.DB, crop);
  return crops.length;
}

async function refreshAll(env: Env): Promise<void> {
  console.log("Wiki refresh starting…");

  try {
    const n = await refreshCrops(env);
    console.log(`Updated ${n} crops`);
  } catch (err) {
    console.error("Crop scrape failed:", err);
  }

  try {
    const villagers = await scrapeVillagers();
    for (const v of villagers) await upsertVillager(env.DB, v);
    console.log(`Updated ${villagers.length} villagers`);
  } catch (err) {
    console.error("Villager scrape failed:", err);
  }

  console.log("Wiki refresh complete");
}

// ── Fetch handler (Discord interactions) ─────────────────────────────────────

async function handleFetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await request.text();
  const signature = request.headers.get("X-Signature-Ed25519") ?? "";
  const timestamp  = request.headers.get("X-Signature-Timestamp") ?? "";

  const valid = await verifyDiscordRequest(env.DISCORD_PUBLIC_KEY, signature, timestamp, body);
  if (!valid) return new Response("Unauthorized", { status: 401 });

  const interaction = JSON.parse(body) as Record<string, unknown>;
  const type = interaction.type as number;

  // PING — required for Discord endpoint verification
  if (type === InteractionType.PING) {
    return Response.json({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const commandName = (interaction.data as Record<string, unknown>)?.name as string;

    if (commandName === "crop") return handleCrop(interaction, env);
    if (commandName === "gift") return handleGift(interaction, env);

    if (commandName === "update") {
      // Respond immediately; kick off crops refresh in the background
      ctx.waitUntil(refreshCrops(env).catch(console.error));
      return Response.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Refreshing crop data from the Stardew Valley Wiki… check back in a moment.",
          flags: 64,
        },
      });
    }
  }

  return new Response("Unknown interaction", { status: 400 });
}

// ── Scheduled handler (Cron Trigger) ─────────────────────────────────────────

async function handleScheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
  ctx.waitUntil(refreshAll(env));
}

// ── Worker export ─────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // On first boot (DB empty), seed the database before handling requests
    const [crops, villagers] = await Promise.all([
      countCrops(env.DB),
      countVillagers(env.DB),
    ]);
    if (crops === 0 && villagers === 0) {
      ctx.waitUntil(refreshAll(env));
    }

    return handleFetch(request, env, ctx);
  },

  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    return handleScheduled(event, env, ctx);
  },
} satisfies ExportedHandler<Env>;
