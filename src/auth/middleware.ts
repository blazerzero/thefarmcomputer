import type { Env } from "@/env";
import type { SessionPayload } from "@/auth/session";
import { requireAuth, isPendingUsername } from "@/auth/session";
import { json } from "@/api/response";

export async function checkSetup(
	request: Request,
	env: Env,
): Promise<{ userId: string } | Response> {
	const auth = await requireAuth(request, env);
	if (auth instanceof Response) return auth;
	if (isPendingUsername(auth.session.username))
		return json({ error: "username_required" }, 403);
	return { userId: auth.session.userId };
}

export async function checkSetupWithSession(
	request: Request,
	env: Env,
): Promise<{ userId: string; session: SessionPayload } | Response> {
	const auth = await requireAuth(request, env);
	if (auth instanceof Response) return auth;
	if (isPendingUsername(auth.session.username))
		return json({ error: "username_required" }, 403);
	return { userId: auth.session.userId, session: auth.session };
}
