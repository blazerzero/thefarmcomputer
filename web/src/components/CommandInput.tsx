import { type FormEvent, useState } from "react";
import styles from "./CommandInput.module.scss";

interface Props {
	onSubmit: (input: string) => void;
	loading: boolean;
}

export function CommandInput({ onSubmit, loading }: Props) {
	const [value, setValue] = useState("");

	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		const trimmed = value.trim();
		if (trimmed) onSubmit(trimmed);
	}

	return (
		<form onSubmit={handleSubmit} className={styles.form}>
			<input
				type="text"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder="crop parsnip"
				disabled={loading}
				autoFocus
				className={styles.input}
			/>
			<button
				type="submit"
				disabled={loading || !value.trim()}
				className={styles.button}
			>
				{loading ? "…" : "Search"}
			</button>
		</form>
	);
}
