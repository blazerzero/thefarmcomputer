import type { Env } from "@/env";
import { isFarmMember } from "@/user-db/farms";
import {
	markFishCaught,
	unmarkFishCaught,
	getFarmFishProgress,
} from "@/user-db/fish";
import { json } from "@/api/response";
import { checkSetup } from "@/auth/middleware";

interface FishRow {
	id: number;
	name: string;
	category: string;
	location: string;
	time: string | null;
	seasons: string;
	weather: string | null;
	difficulty: number | null;
	sell_price: number | null;
	image_url: string | null;
	wiki_url: string;
}

async function getAllFish(env: Env): Promise<FishRow[]> {
	const stub = env.STARDEW_DO.get(env.STARDEW_DO.idFromName("primary"));
	const res = await stub.fetch(new Request("https://internal/internal/fish"));
	if (!res.ok) throw new Error("Failed to fetch fish from DO");
	return (await res.json()) as FishRow[];
}

export async function handleGetFishProgress(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	const { farmId } = params;
	if (!farmId) return json({ error: "missing_farm_id" }, 400);

	const member = await isFarmMember(env.USER_DB, farmId, user.userId);
	if (!member) return json({ error: "forbidden" }, 403);

	const [allFish, progressRows] = await Promise.all([
		getAllFish(env),
		getFarmFishProgress(env.USER_DB, farmId),
	]);

	const caughtMap = new Map<
		number,
		{ marked_by: string; marked_at: string; user_id: string }[]
	>();
	for (const row of progressRows) {
		const list = caughtMap.get(row.fish_id) ?? [];
		list.push({
			marked_by: row.marked_by,
			marked_at: row.marked_at,
			user_id: row.user_id,
		});
		caughtMap.set(row.fish_id, list);
	}

	const fish = allFish.map((f) => {
		const catchers = caughtMap.get(f.id) ?? [];
		const myEntry = catchers.find((c) => c.user_id === user.userId);
		const also_caught_by = catchers
			.filter((c) => c.user_id !== user.userId)
			.map((c) => c.marked_by);
		return {
			id: f.id,
			name: f.name,
			category: f.category,
			location: f.location,
			time: f.time,
			seasons: JSON.parse(f.seasons || "[]") as string[],
			weather: f.weather,
			difficulty: f.difficulty,
			sell_price: f.sell_price,
			image_url: f.image_url,
			wiki_url: f.wiki_url,
			caught_by_me: !!myEntry,
			caught_by_me_at: myEntry?.marked_at ?? null,
			also_caught_by,
		};
	});

	return json({ fish });
}

export async function handleMarkFishCaught(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	const { farmId, fishId } = params;
	if (!farmId || !fishId) return json({ error: "missing_params" }, 400);

	const member = await isFarmMember(env.USER_DB, farmId, user.userId);
	if (!member) return json({ error: "forbidden" }, 403);

	await markFishCaught(env.USER_DB, farmId, user.userId, Number(fishId));
	return json({ ok: true });
}

export async function handleUnmarkFishCaught(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	const { farmId, fishId } = params;
	if (!farmId || !fishId) return json({ error: "missing_params" }, 400);

	const member = await isFarmMember(env.USER_DB, farmId, user.userId);
	if (!member) return json({ error: "forbidden" }, 403);

	await unmarkFishCaught(env.USER_DB, farmId, user.userId, Number(fishId));
	return json({ ok: true });
}
