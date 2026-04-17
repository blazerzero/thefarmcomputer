export function base64urlEncode(buf: ArrayBuffer): string {
	return btoa(String.fromCharCode(...new Uint8Array(buf)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

export function base64urlDecode(s: string): Uint8Array {
	const padded = s.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(padded);
	return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
