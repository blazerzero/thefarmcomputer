import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./shared.module.scss";

export function NewFarmPage() {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [emoji, setEmoji] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		setSaving(true);
		setError(null);
		try {
			const res = await fetch("/api/farms", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					emoji: emoji.trim() || null,
				}),
			});
			const data = (await res.json()) as {
				ok: boolean;
				farm_id?: string;
				error?: string;
			};
			if (!data.ok || !data.farm_id) {
				setError("Failed to create farm. Please try again.");
			} else {
				navigate(`/farms/${data.farm_id}`, { replace: true });
			}
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className={styles.page}>
			<nav className={styles.nav}>
				<Link to="/dashboard">Dashboard</Link>
				<span className={styles.sep}>›</span>
				<span>New farm</span>
			</nav>

			<h1 className={styles.h1}>Add a farm</h1>

			<form
				onSubmit={handleSubmit}
				className={styles.card}
				style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
			>
				<div className={styles.fieldGroup}>
					<label className={styles.label} htmlFor="farm-name">
						Farm name
					</label>
					<input
						id="farm-name"
						className={styles.input}
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Pelican Town Farm"
						maxLength={64}
						required
					/>
				</div>

				<div className={styles.fieldGroup}>
					<label className={styles.label} htmlFor="farm-emoji">
						Emoji (optional)
					</label>
					<input
						id="farm-emoji"
						className={styles.input}
						value={emoji}
						onChange={(e) => setEmoji(e.target.value)}
						placeholder="🌾"
						maxLength={8}
						style={{ maxWidth: "6rem" }}
					/>
					<span className={styles.hint}>
						A single emoji to identify this farm in The Farm Computer.
					</span>
				</div>

				{error && <p className={styles.error}>{error}</p>}

				<div className={styles.row}>
					<button
						type="submit"
						className={styles.btnPrimary}
						disabled={!name.trim() || saving}
					>
						{saving ? "Creating…" : "Create farm"}
					</button>
					<Link
						to="/dashboard"
						className={styles.btnGhost}
						style={{ textDecoration: "none" }}
					>
						Cancel
					</Link>
				</div>
			</form>
		</div>
	);
}
