export function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export function badRequest(msg: string): Response {
	return json({ error: msg }, 400);
}

export function serverError(msg: string): Response {
	return json({ error: msg }, 500);
}
