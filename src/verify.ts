/**
 * Verify a Discord interaction request using the Ed25519 signature.
 * Uses the Web Crypto API which is available natively in Cloudflare Workers.
 */
export async function verifyDiscordRequest(
	publicKeyHex: string,
	signature: string,
	timestamp: string,
	body: string,
): Promise<boolean> {
	const encoder = new TextEncoder();

	const publicKeyBytes = hexToUint8Array(publicKeyHex);
	const signatureBytes = hexToUint8Array(signature);
	const message = encoder.encode(timestamp + body);

	try {
		const cryptoKey = await crypto.subtle.importKey(
			"raw",
			publicKeyBytes,
			{ name: "Ed25519" },
			false,
			["verify"],
		);
		return await crypto.subtle.verify(
			"Ed25519",
			cryptoKey,
			signatureBytes,
			message,
		);
	} catch {
		return false;
	}
}

function hexToUint8Array(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return bytes;
}
