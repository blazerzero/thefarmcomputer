import { useState } from "react";
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
				<h1 className={styles.title}>The Farm Computer</h1>
				<p className={styles.subtitle}>Stardew Valley reference — type a command below</p>
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
		</div>
	);
}
