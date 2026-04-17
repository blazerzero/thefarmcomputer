import type { Env } from "@/env";
import type { BundleRow, BundleItem } from "@/types";
import { requireAuth, isPendingUsername } from "@/auth/session";
import { isFarmMember } from "@/user-db/farms";
import {
	markBundleItem,
	unmarkBundleItem,
	getFarmBundleProgress,
} from "@/user-db/bundles";

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

async function checkSetup(
	request: Request,
	env: Env,
): Promise<{ userId: string } | Response> {
	const auth = await requireAuth(request, env);
	if (auth instanceof Response) return auth;
	if (isPendingUsername(auth.session.username))
		return json({ error: "username_required" }, 403);
	return { userId: auth.session.userId };
}

/** Fetches all bundle rows from the StardewDO via the internal endpoint. */
async function getAllBundles(
	env: Env,
): Promise<Array<BundleRow & { id: number; items: string }>> {
	const stub = env.STARDEW_DO.get(env.STARDEW_DO.idFromName("primary"));
	const res = await stub.fetch(
		new Request("https://internal/internal/bundles"),
	);
	if (!res.ok) throw new Error("Failed to fetch bundles from DO");
	return (await res.json()) as Array<BundleRow & { id: number; items: string }>;
}

export async function handleGetBundleProgress(
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

	const [allBundles, progressRows] = await Promise.all([
		getAllBundles(env),
		getFarmBundleProgress(env.USER_DB, farmId),
	]);

	// Index progress by bundleId + itemName
	const checkedMap = new Map<
		string,
		{ marked_by: string; marked_at: string }
	>();
	for (const row of progressRows) {
		checkedMap.set(`${row.bundle_id}:${row.item_name}`, {
			marked_by: row.marked_by,
			marked_at: row.marked_at,
		});
	}

	const bundles = allBundles.map((bundle) => {
		const items: BundleItem[] = JSON.parse(
			bundle.items || "[]",
		) as BundleItem[];
		const annotated = items.map((item) => {
			const key = `${bundle.id}:${item.name}`;
			const checked = checkedMap.get(key);
			return {
				name: item.name,
				quantity: item.quantity,
				quality: item.quality ?? null,
				checked: !!checked,
				checked_by: checked?.marked_by ?? null,
				checked_at: checked?.marked_at ?? null,
			};
		});
		const checkedCount = annotated.filter((i) => i.checked).length;
		return {
			id: bundle.id,
			name: bundle.name,
			room: bundle.room,
			items_required: bundle.items_required,
			reward: bundle.reward,
			image_url: bundle.image_url,
			wiki_url: bundle.wiki_url,
			items: annotated,
			items_checked: checkedCount,
			complete: checkedCount >= bundle.items_required,
		};
	});

	return json({ bundles });
}

export async function handleMarkBundleItem(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	const { farmId, bundleId, itemName } = params;
	if (!farmId || !bundleId || !itemName)
		return json({ error: "missing_params" }, 400);

	const member = await isFarmMember(env.USER_DB, farmId, user.userId);
	if (!member) return json({ error: "forbidden" }, 403);

	await markBundleItem(
		env.USER_DB,
		farmId,
		user.userId,
		Number(bundleId),
		itemName,
	);
	return json({ ok: true });
}

export async function handleUnmarkBundleItem(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	const { farmId, bundleId, itemName } = params;
	if (!farmId || !bundleId || !itemName)
		return json({ error: "missing_params" }, 400);

	const member = await isFarmMember(env.USER_DB, farmId, user.userId);
	if (!member) return json({ error: "forbidden" }, 403);

	await unmarkBundleItem(env.USER_DB, farmId, Number(bundleId), itemName);
	return json({ ok: true });
}
