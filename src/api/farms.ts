import type { Env } from "@/env";
import { requireAuth, isPendingUsername } from "@/auth/session";
import {
	createFarm,
	listFarmsForUser,
	getFarm,
	updateFarm,
	deleteFarm as dbDeleteFarm,
	isFarmMember,
	isFarmOwner,
	listMembers as dbListMembers,
	removeMember as dbRemoveMember,
} from "@/user-db/farms";

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
	if (isPendingUsername(auth.session.username)) {
		return json({ error: "username_required" }, 403);
	}
	return { userId: auth.session.userId };
}

export async function handleListFarms(
	request: Request,
	env: Env,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;
	const farms = await listFarmsForUser(env.USER_DB, user.userId);
	return json({ farms });
}

export async function handleCreateFarm(
	request: Request,
	env: Env,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	let body: { name?: string; emoji?: string | null };
	try {
		body = (await request.json()) as { name?: string; emoji?: string | null };
	} catch {
		return json({ error: "invalid_json" }, 400);
	}

	const { name, emoji = null } = body;
	if (!name || name.trim().length === 0)
		return json({ error: "name_required" }, 400);

	const farmId = await createFarm(
		env.USER_DB,
		user.userId,
		name.trim(),
		emoji ?? null,
	);
	return json({ ok: true, farm_id: farmId }, 201);
}

export async function handleGetFarm(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	const { farmId } = params;
	if (!farmId) return json({ error: "missing_farm_id" }, 400);

	const farm = await getFarm(env.USER_DB, farmId);
	if (!farm) return json({ error: "not_found" }, 404);

	const member = await isFarmMember(env.USER_DB, farmId, user.userId);
	if (!member) return json({ error: "forbidden" }, 403);

	return json({ farm });
}

export async function handleUpdateFarm(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	const { farmId } = params;
	if (!farmId) return json({ error: "missing_farm_id" }, 400);

	const owner = await isFarmOwner(env.USER_DB, farmId, user.userId);
	if (!owner) return json({ error: "forbidden" }, 403);

	let body: { name?: string; emoji?: string | null };
	try {
		body = (await request.json()) as { name?: string; emoji?: string | null };
	} catch {
		return json({ error: "invalid_json" }, 400);
	}

	const { name, emoji = null } = body;
	if (!name || name.trim().length === 0)
		return json({ error: "name_required" }, 400);

	await updateFarm(env.USER_DB, farmId, name.trim(), emoji ?? null);
	return json({ ok: true });
}

export async function handleDeleteFarm(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	const { farmId } = params;
	if (!farmId) return json({ error: "missing_farm_id" }, 400);

	const owner = await isFarmOwner(env.USER_DB, farmId, user.userId);
	if (!owner) return json({ error: "forbidden" }, 403);

	await dbDeleteFarm(env.USER_DB, farmId);
	return json({ ok: true });
}

export async function handleListMembers(
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

	const members = await dbListMembers(env.USER_DB, farmId);
	return json({ members });
}

export async function handleRemoveMember(
	request: Request,
	env: Env,
	params: Record<string, string>,
): Promise<Response> {
	const user = await checkSetup(request, env);
	if (user instanceof Response) return user;

	const { farmId, userId: targetUserId } = params;
	if (!farmId || !targetUserId) return json({ error: "missing_params" }, 400);

	const owner = await isFarmOwner(env.USER_DB, farmId, user.userId);
	const isSelf = user.userId === targetUserId;

	// Owner can remove anyone; members can only remove themselves
	if (!owner && !isSelf) return json({ error: "forbidden" }, 403);
	// Cannot remove the farm owner
	const targetIsOwner = await isFarmOwner(env.USER_DB, farmId, targetUserId);
	if (targetIsOwner) return json({ error: "cannot_remove_owner" }, 400);

	await dbRemoveMember(env.USER_DB, farmId, targetUserId);
	return json({ ok: true });
}
