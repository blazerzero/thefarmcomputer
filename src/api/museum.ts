import type { Env } from "@/env";
import { isFarmMember } from "@/user-db/farms";
import {
	markDonation,
	unmarkDonation,
	getFarmMuseumProgress,
} from "@/user-db/museum";
import { json } from "@/api/response";
import { checkSetup } from "@/auth/middleware";

interface ArtifactRow {
	id: number;
	name: string;
	description: string | null;
	location: string;
	image_url: string | null;
	wiki_url: string;
}

interface MineralRow {
	id: number;
	name: string;
	category: string;
	description: string | null;
	source: string;
	image_url: string | null;
	wiki_url: string;
}

async function getAllArtifacts(env: Env): Promise<ArtifactRow[]> {
	const stub = env.STARDEW_DO.get(env.STARDEW_DO.idFromName("primary"));
	const res = await stub.fetch(new Request("https://internal/internal/artifacts"));
	if (!res.ok) throw new Error("Failed to fetch artifacts from DO");
	return (await res.json()) as ArtifactRow[];
}

async function getAllMinerals(env: Env): Promise<MineralRow[]> {
	const stub = env.STARDEW_DO.get(env.STARDEW_DO.idFromName("primary"));
	const res = await stub.fetch(new Request("https://internal/internal/minerals"));
	if (!res.ok) throw new Error("Failed to fetch minerals from DO");
	return (await res.json()) as MineralRow[];
}

export async function handleGetMuseumProgress(
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

	const [allArtifacts, allMinerals, progressRows] = await Promise.all([
		getAllArtifacts(env),
		getAllMinerals(env),
		getFarmMuseumProgress(env.USER_DB, farmId),
	]);

	const donatedMap = new Map<string, { marked_by: string; marked_at: string }>();
	for (const row of progressRows) {
		donatedMap.set(`${row.item_type}:${row.item_id}`, {
			marked_by: row.marked_by,
			marked_at: row.marked_at,
		});
	}

	const artifacts = allArtifacts.map((a) => {
		const donated = donatedMap.get(`artifact:${a.id}`);
		return {
			id: a.id,
			name: a.name,
			description: a.description,
			location: JSON.parse(a.location || "[]") as string[],
			image_url: a.image_url,
			wiki_url: a.wiki_url,
			donated: !!donated,
			donated_by: donated?.marked_by ?? null,
			donated_at: donated?.marked_at ?? null,
		};
	});

	const minerals = allMinerals.map((m) => {
		const donated = donatedMap.get(`mineral:${m.id}`);
		return {
			id: m.id,
			name: m.name,
			category: m.category,
			description: m.description,
			source: JSON.parse(m.source || "[]") as string[],
			image_url: m.image_url,
			wiki_url: m.wiki_url,
			donated: !!donated,
			donated_by: donated?.marked_by ?? null,
			donated_at: donated?.marked_at ?? null,
		};
	});

	return json({ artifacts, minerals });
}

export async function handleMarkDonation(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	const { farmId, itemType, itemId } = params;
	if (!farmId || !itemType || !itemId)
		return json({ error: "missing_params" }, 400);
	if (itemType !== "artifact" && itemType !== "mineral")
		return json({ error: "invalid_item_type" }, 400);

	const member = await isFarmMember(env.USER_DB, farmId, user.userId);
	if (!member) return json({ error: "forbidden" }, 403);

	await markDonation(env.USER_DB, farmId, user.userId, itemType, Number(itemId));
	return json({ ok: true });
}

export async function handleUnmarkDonation(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	const { farmId, itemType, itemId } = params;
	if (!farmId || !itemType || !itemId)
		return json({ error: "missing_params" }, 400);
	if (itemType !== "artifact" && itemType !== "mineral")
		return json({ error: "invalid_item_type" }, 400);

	const member = await isFarmMember(env.USER_DB, farmId, user.userId);
	if (!member) return json({ error: "forbidden" }, 403);

	await unmarkDonation(env.USER_DB, farmId, itemType, Number(itemId));
	return json({ ok: true });
}
