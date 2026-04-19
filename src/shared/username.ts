const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

// Words that are confusing, impersonate system roles, or are generic pronouns/terms
export const BLOCKED_USERNAMES = new Set([
	// Personal pronouns
	"i",
	"me",
	"my",
	"mine",
	"myself",
	"you",
	"your",
	"yours",
	"yourself",
	"he",
	"him",
	"his",
	"himself",
	"she",
	"her",
	"hers",
	"herself",
	"it",
	"its",
	"itself",
	"we",
	"us",
	"our",
	"ours",
	"ourselves",
	"they",
	"them",
	"their",
	"theirs",
	"themselves",
	// Demonstrative / indefinite pronouns
	"this",
	"that",
	"these",
	"those",
	"someone",
	"somebody",
	"anyone",
	"anybody",
	"everyone",
	"everybody",
	"nobody",
	"noone",
	// System / role names
	"admin",
	"administrator",
	"root",
	"system",
	"support",
	"moderator",
	"mod",
	"staff",
	"owner",
	"operator",
	"bot",
	"guest",
	"user",
	"anonymous",
	"anon",
	// Reserved / null-ish
	"null",
	"undefined",
	"none",
	"unknown",
	"default",
	"test",
	"demo",
	"example",
	"sample",
]);

export function isValidUsername(username: string): boolean {
	return USERNAME_RE.test(username);
}

export function isReservedUsername(username: string): boolean {
	return BLOCKED_USERNAMES.has(username.toLowerCase());
}
