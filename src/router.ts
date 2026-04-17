import type { Env } from "@/env";
import {
	handleGoogleStart,
	handleGoogleCallback,
	handleLogout,
} from "@/auth/routes";
import {
	handleGetMe,
	handleSetUsername,
	handleDeleteAccount,
	handleSearchUsers,
} from "@/api/users";
import {
	handleListFarms,
	handleCreateFarm,
	handleGetFarm,
	handleUpdateFarm,
	handleDeleteFarm,
} from "@/api/farms";
import { handleListMembers, handleRemoveMember } from "@/api/members";
import {
	handleCreateInvitation,
	handleListInvitations,
	handleCancelInvitation,
	handleGetInvitation,
	handleGetPendingInvitations,
	handleAcceptInvitation,
	handleDeclineInvitation,
} from "@/api/invitations";
import {
	handleGetBundleProgress,
	handleMarkBundleItem,
	handleUnmarkBundleItem,
} from "@/api/bundles";

/** Extracts path params from a pattern like '/api/farms/:farmId/members/:userId'. Returns null if no match. */
export function matchPath(
	pattern: string,
	pathname: string,
): Record<string, string> | null {
	const patternParts = pattern.split("/");
	const pathParts = pathname.split("/");
	if (patternParts.length !== pathParts.length) return null;
	const params: Record<string, string> = {};
	for (let i = 0; i < patternParts.length; i++) {
		const p = patternParts[i];
		const v = pathParts[i];
		if (p === undefined || v === undefined) return null;
		if (p.startsWith(":")) {
			params[p.slice(1)] = decodeURIComponent(v);
		} else if (p !== v) {
			return null;
		}
	}
	return params;
}

type Handler = (
	request: Request,
	env: Env,
	params: Record<string, string>,
) => Promise<Response>;

interface Route {
	method: string;
	pattern: string;
	handler: Handler;
}

const ROUTES: Route[] = [
	// Auth
	{
		method: "GET",
		pattern: "/auth/google/start",
		handler: (req, env) => handleGoogleStart(req, env),
	},
	{
		method: "GET",
		pattern: "/auth/google/callback",
		handler: (req, env) => handleGoogleCallback(req, env),
	},
	{
		method: "POST",
		pattern: "/auth/logout",
		handler: (req, env) => handleLogout(req, env),
	},

	// User
	{
		method: "GET",
		pattern: "/api/me",
		handler: (req, env) => handleGetMe(req, env),
	},
	{
		method: "PUT",
		pattern: "/api/me/username",
		handler: (req, env) => handleSetUsername(req, env),
	},
	{
		method: "DELETE",
		pattern: "/api/me",
		handler: (req, env) => handleDeleteAccount(req, env),
	},
	{
		method: "GET",
		pattern: "/api/users/search",
		handler: (req, env) => handleSearchUsers(req, env),
	},

	// Farms
	{
		method: "GET",
		pattern: "/api/farms",
		handler: (req, env) => handleListFarms(req, env),
	},
	{
		method: "POST",
		pattern: "/api/farms",
		handler: (req, env) => handleCreateFarm(req, env),
	},
	{
		method: "GET",
		pattern: "/api/farms/:farmId",
		handler: (req, env, p) => handleGetFarm(req, env, p),
	},
	{
		method: "PUT",
		pattern: "/api/farms/:farmId",
		handler: (req, env, p) => handleUpdateFarm(req, env, p),
	},
	{
		method: "DELETE",
		pattern: "/api/farms/:farmId",
		handler: (req, env, p) => handleDeleteFarm(req, env, p),
	},

	// Members
	{
		method: "GET",
		pattern: "/api/farms/:farmId/members",
		handler: (req, env, p) => handleListMembers(req, env, p),
	},
	{
		method: "DELETE",
		pattern: "/api/farms/:farmId/members/:userId",
		handler: (req, env, p) => handleRemoveMember(req, env, p),
	},

	// Invitations
	{
		method: "POST",
		pattern: "/api/farms/:farmId/invitations",
		handler: (req, env, p) => handleCreateInvitation(req, env, p),
	},
	{
		method: "GET",
		pattern: "/api/farms/:farmId/invitations",
		handler: (req, env, p) => handleListInvitations(req, env, p),
	},
	{
		method: "DELETE",
		pattern: "/api/farms/:farmId/invitations/:id",
		handler: (req, env, p) => handleCancelInvitation(req, env, p),
	},
	{
		method: "GET",
		pattern: "/api/invitations/pending",
		handler: (req, env) => handleGetPendingInvitations(req, env),
	},
	{
		method: "GET",
		pattern: "/api/invitations/:id",
		handler: (req, env, p) => handleGetInvitation(req, env, p),
	},
	{
		method: "POST",
		pattern: "/api/invitations/:id/accept",
		handler: (req, env, p) => handleAcceptInvitation(req, env, p),
	},
	{
		method: "POST",
		pattern: "/api/invitations/:id/decline",
		handler: (req, env, p) => handleDeclineInvitation(req, env, p),
	},

	// Bundle tracking
	{
		method: "GET",
		pattern: "/api/farms/:farmId/bundles",
		handler: (req, env, p) => handleGetBundleProgress(req, env, p),
	},
	{
		method: "POST",
		pattern: "/api/farms/:farmId/bundles/:bundleId/items/:itemName",
		handler: (req, env, p) => handleMarkBundleItem(req, env, p),
	},
	{
		method: "DELETE",
		pattern: "/api/farms/:farmId/bundles/:bundleId/items/:itemName",
		handler: (req, env, p) => handleUnmarkBundleItem(req, env, p),
	},
];

/**
 * Attempts to match request to a user-system route.
 * Returns null if no route matched (caller falls through to existing logic).
 */
export async function routeUserApiRequest(
	request: Request,
	env: Env,
	pathname: string,
	method: string,
): Promise<Response | null> {
	for (const route of ROUTES) {
		if (route.method !== method) continue;
		const params = matchPath(route.pattern, pathname);
		if (params !== null) {
			return route.handler(request, env, params);
		}
	}
	return null;
}
