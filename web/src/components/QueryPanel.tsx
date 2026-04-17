import { useState } from "react";
import { CommandForm } from "./CommandForm";
import { EmbedCard } from "./EmbedCard";
import { stripMarkdown } from "../utils/formatting";
import type { QueryResult } from "../types";
import styles from "./QueryPanel.module.scss";

export function QueryPanel() {
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
			setResult({ error: "Failed to reach the server." });
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className={styles.panel}>
			<h2 className={styles.heading}>Ask the Farm Computer</h2>
			<CommandForm onSubmit={handleSubmit} loading={loading} />
			{loading && <p className={styles.hint}>Loading…</p>}
			{result &&
				!loading &&
				(result.error ? (
					<p className={styles.error}>{stripMarkdown(result.error)}</p>
				) : result.embed ? (
					<EmbedCard embed={result.embed} />
				) : null)}
		</div>
	);
}
