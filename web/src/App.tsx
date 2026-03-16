import { useState } from "react";
import { FaDiscord } from "react-icons/fa";
import styles from "./App.module.scss";
import { CommandHelp } from "./components/CommandHelp";
import { CommandInput } from "./components/CommandInput";
import { EmbedCard } from "./components/EmbedCard";
import type { QueryResult } from "./types";

/** Strip Discord markdown bold/italic markers for plain text display. */
function stripMarkdown(text: string): string {
	return text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/__/g, "").replace(/_/g, "");
}

export default function App() {
	const [result, setResult] = useState<QueryResult | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(input: string) {
		setLoading(true);
		setResult(null);
		try {
			const res = await fetch(`/api/query?input=${encodeURIComponent(input)}`);
			const data = (await res.json()) as QueryResult;
			setResult(data);
		} catch {
			setResult({ error: "Failed to reach the server. Make sure wrangler dev is running." });
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className={styles.page}>
			<div className={styles.header}>
				<h1 className={styles.title}>The Farm Computer 💾</h1>
				<p className={styles.subtitle}>
					A Discord bot and web tool for searching in-game details for Stardew Valley, sourced from the{" "}
					<a href="https://stardewvalleywiki.com" target="_blank" rel="noreferrer">official wiki</a>.
				</p>
				<a
					href="https://discord.com/oauth2/authorize?client_id=1479385265327046677"
					target="_blank"
					rel="noreferrer"
					className={styles.discordButton}
				>
					<FaDiscord className={styles.discordIcon} aria-hidden="true" />
					Add to Discord
				</a>
			</div>

			<CommandInput onSubmit={handleSubmit} loading={loading} />

			{loading && <p className={styles.loading}>Loading…</p>}

			{result && !loading && (
				result.error ? (
					<div className={styles.error}>{stripMarkdown(result.error)}</div>
				) : result.embed ? (
					<EmbedCard embed={result.embed} />
				) : null
			)}

			<CommandHelp />

			<footer className={styles.footer}>
				© {new Date().getFullYear()} Omeed Habibelahian
			</footer>
		</div>
	);
}
