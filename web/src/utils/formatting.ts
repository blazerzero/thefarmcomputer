export function stripMarkdown(text: string): string {
	return text
		.replace(/\*\*/g, "")
		.replace(/\*/g, "")
		.replace(/__/g, "")
		.replace(/_/g, "");
}
