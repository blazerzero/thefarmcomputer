import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BLOCKED_USERNAMES } from "@/api/shared/username";
import { useSession } from "../context/SessionContext";
import styles from "./shared.module.scss";

export function UsernameSetupPage() {
	const { user, loading, refetch } = useSession();
	const navigate = useNavigate();
	const [username, setUsername] = useState("");
	const [status, setStatus] = useState<
		"idle" | "checking" | "available" | "taken" | "invalid" | "reserved"
	>("idle");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (!loading && user && !user.setup_required) {
			navigate("/dashboard", { replace: true });
		}
	}, [user, loading, navigate]);

	function handleChange(value: string) {
		const lower = value.toLowerCase();
		setUsername(lower);
		setError(null);

		if (debounceRef.current) clearTimeout(debounceRef.current);
		if (!lower) {
			setStatus("idle");
			return;
		}
		if (!/^[a-z0-9_]{3,24}$/.test(lower)) {
			setStatus("invalid");
			return;
		}
		if (BLOCKED_USERNAMES.has(lower)) {
			setStatus("reserved");
			return;
		}

		setStatus("checking");
		debounceRef.current = setTimeout(async () => {
			const res = await fetch(
				`/api/users/search?q=${encodeURIComponent(lower)}`,
			);
			const data = (await res.json()) as { users: Array<{ username: string }> };
			const exact = data.users.some((u) => u.username === lower);
			setStatus(exact ? "taken" : "available");
		}, 350);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (status !== "available") return;
		setSaving(true);
		setError(null);
		try {
			const res = await fetch("/api/me/username", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username }),
			});
			const data = (await res.json()) as { ok: boolean; error?: string };
			if (!data.ok) {
				if (data.error === "taken") {
					setError("That username was just taken. Try another.");
				} else if (data.error === "reserved") {
					setError("That username is reserved. Please choose another.");
					setStatus("reserved");
				} else {
					setError("Something went wrong.");
				}
				if (data.error !== "reserved") setStatus("idle");
			} else {
				refetch();
				navigate("/dashboard", { replace: true });
			}
		} finally {
			setSaving(false);
		}
	}

	const statusMsg: Record<string, string> = {
		checking: "Checking…",
		available: "Available!",
		taken: "Already taken",
		invalid: "3–24 chars, lowercase letters, numbers, underscores only",
		reserved: "That username is reserved",
	};

	return (
		<div className={styles.page}>
			<h1 className={styles.h1}>Choose a username</h1>
			<p style={{ color: "var(--text-muted)" }}>
				Pick a username so others can find and invite you. You can't change it
				later, so choose wisely.
			</p>
			<form
				onSubmit={handleSubmit}
				className={styles.card}
				style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
			>
				<div className={styles.fieldGroup}>
					<label className={styles.label} htmlFor="username">
						Username
					</label>
					<input
						id="username"
						className={styles.input}
						value={username}
						onChange={(e) => handleChange(e.target.value)}
						placeholder="farmgirl42"
						autoComplete="off"
						maxLength={24}
					/>
					{status !== "idle" && (
						<span
							className={styles.hint}
							style={{
								color:
									status === "available"
										? "var(--accent)"
										: status === "checking"
											? "var(--text-muted)"
											: "#ed4245",
							}}
						>
							{statusMsg[status]}
						</span>
					)}
				</div>
				{error && <p className={styles.error}>{error}</p>}
				<button
					type="submit"
					className={styles.btnPrimary}
					disabled={status !== "available" || saving}
					style={{ alignSelf: "flex-start" }}
				>
					{saving ? "Saving…" : "Set username"}
				</button>
			</form>
		</div>
	);
}
