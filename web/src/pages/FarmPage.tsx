import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { useSession } from "../context/SessionContext";
import pageStyles from "./FarmPage.module.scss";
import styles from "./shared.module.scss";

interface Farm {
	id: string;
	name: string;
	emoji: string | null;
	owner_id: string;
}

interface Member {
	user_id: string;
	username: string;
	avatar_url: string | null;
	role: string;
	joined_at: string;
}

interface UserResult {
	id: string;
	username: string;
	avatar_url: string | null;
}

export function FarmPage() {
	const { farmId } = useParams<{ farmId: string }>();
	const { user } = useSession();
	const navigate = useNavigate();

	const [farm, setFarm] = useState<Farm | null>(null);
	const [members, setMembers] = useState<Member[]>([]);
	const [editName, setEditName] = useState("");
	const [editEmoji, setEditEmoji] = useState("");
	const [saving, setSaving] = useState(false);
	const [inviteQuery, setInviteQuery] = useState("");
	const [inviteResults, setInviteResults] = useState<UserResult[]>([]);
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteMode, setInviteMode] = useState<"username" | "email">(
		"username",
	);
	const [inviteStatus, setInviteStatus] = useState<string | null>(null);
	const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const isOwner = user?.id === farm?.owner_id;

	useEffect(() => {
		if (!farmId) return;
		fetch(`/api/farms/${farmId}`)
			.then((r) => r.json())
			.then((d: { farm: Farm }) => {
				setFarm(d.farm);
				setEditName(d.farm.name);
				setEditEmoji(d.farm.emoji ?? "");
			});
		fetch(`/api/farms/${farmId}/members`)
			.then((r) => r.json())
			.then((d: { members: Member[] }) => setMembers(d.members));
	}, [farmId]);

	function handleSearchChange(q: string) {
		setInviteQuery(q);
		if (searchRef.current) clearTimeout(searchRef.current);
		if (!q.trim()) {
			setInviteResults([]);
			return;
		}
		searchRef.current = setTimeout(async () => {
			const res = await fetch(
				`/api/users/search?q=${encodeURIComponent(q.trim())}`,
			);
			const data = (await res.json()) as { users: UserResult[] };
			setInviteResults(data.users);
		}, 300);
	}

	async function handleInviteByUsername(
		targetId: string,
		targetUsername: string,
	) {
		setInviteStatus(null);
		const res = await fetch(`/api/farms/${farmId}/invitations`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username: targetUsername }),
		});
		const data = (await res.json()) as { ok: boolean; error?: string };
		setInviteStatus(
			data.ok ? `Invited ${targetUsername}!` : (data.error ?? "Failed"),
		);
		setInviteQuery("");
		setInviteResults([]);
	}

	async function handleInviteByEmail(e: React.FormEvent) {
		e.preventDefault();
		if (!inviteEmail.trim()) return;
		setInviteStatus(null);
		const res = await fetch(`/api/farms/${farmId}/invitations`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: inviteEmail.trim() }),
		});
		const data = (await res.json()) as { ok: boolean; error?: string };
		setInviteStatus(
			data.ok ? `Invitation sent to ${inviteEmail}!` : (data.error ?? "Failed"),
		);
		setInviteEmail("");
	}

	async function handleSaveFarm(e: React.FormEvent) {
		e.preventDefault();
		if (!editName.trim() || !farmId) return;
		setSaving(true);
		await fetch(`/api/farms/${farmId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: editName.trim(),
				emoji: editEmoji.trim() || null,
			}),
		});
		setFarm((f) =>
			f ? { ...f, name: editName.trim(), emoji: editEmoji.trim() || null } : f,
		);
		setSaving(false);
	}

	async function handleRemoveMember(memberId: string) {
		if (!farmId) return;
		await fetch(`/api/farms/${farmId}/members/${memberId}`, {
			method: "DELETE",
		});
		setMembers((ms) => ms.filter((m) => m.user_id !== memberId));
	}

	async function handleDeleteFarm() {
		if (!farmId || !confirm("Delete this farm? This cannot be undone.")) return;
		await fetch(`/api/farms/${farmId}`, { method: "DELETE" });
		navigate("/dashboard", { replace: true });
	}

	if (!farm) return null;

	return (
		<>
			<Navbar />
			<div className={styles.page}>
				<div>
					<nav className={styles.nav}>
						<Link to="/dashboard">My farms</Link>
						<span className={styles.sep}>›</span>
						<span>
							{farm.emoji ? `${farm.emoji} ` : ""}
							{farm.name}
						</span>
					</nav>
					<h1 className={styles.h1} style={{ marginTop: "0.25rem" }}>
						{farm.emoji ? `${farm.emoji} ` : ""}
						{farm.name}
					</h1>
				</div>

				<div className={pageStyles.featureGrid}>
					<Link
						to={`/farms/${farmId}/bundles`}
						className={pageStyles.featureCard}
					>
						<span className={pageStyles.featureIcon}>📦</span>
						<span className={pageStyles.featureTitle}>Bundles</span>
						<span className={pageStyles.featureDesc}>
							Track Community Center bundle progress
						</span>
					</Link>
					<Link
						to={`/farms/${farmId}/museum`}
						className={pageStyles.featureCard}
					>
						<span className={pageStyles.featureIcon}>🏛️</span>
						<span className={pageStyles.featureTitle}>Museum</span>
						<span className={pageStyles.featureDesc}>
							Track artifact and mineral donations
						</span>
					</Link>
					<Link to={`/farms/${farmId}/fish`} className={pageStyles.featureCard}>
						<span className={pageStyles.featureIcon}>🐟</span>
						<span className={pageStyles.featureTitle}>Fish</span>
						<span className={pageStyles.featureDesc}>
							Track fish you've caught
						</span>
					</Link>
				</div>

				{isOwner && (
					<div className={styles.card}>
						<h2 className={styles.h2}>Farm settings</h2>
						<form
							onSubmit={handleSaveFarm}
							style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
						>
							<div className={styles.fieldGroup}>
								<label className={styles.label} htmlFor="farm-name">
									Name
								</label>
								<input
									id="farm-name"
									className={styles.input}
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									maxLength={64}
									required
								/>
							</div>
							<div className={styles.fieldGroup}>
								<label className={styles.label} htmlFor="farm-emoji">
									Emoji
								</label>
								<input
									id="farm-emoji"
									className={styles.input}
									value={editEmoji}
									onChange={(e) => setEditEmoji(e.target.value)}
									maxLength={8}
									style={{ maxWidth: "6rem" }}
								/>
							</div>
							<div className={styles.row}>
								<button
									type="submit"
									className={styles.btnPrimary}
									disabled={saving}
								>
									{saving ? "Saving…" : "Save"}
								</button>
								<button
									type="button"
									className={styles.btnDanger}
									onClick={handleDeleteFarm}
								>
									Delete farm
								</button>
							</div>
						</form>
					</div>
				)}

				<div className={styles.card}>
					<h2 className={styles.h2}>Members</h2>
					<div className={styles.list}>
						{members.map((m) => (
							<div key={m.user_id} className={styles.listItem}>
								<div className={styles.row}>
									{m.avatar_url && (
										<img
											src={m.avatar_url}
											alt=""
											style={{
												width: "1.75rem",
												height: "1.75rem",
												borderRadius: "50%",
											}}
										/>
									)}
									<span>{m.username}</span>
									<span className={styles.hint}>{m.role}</span>
								</div>
								{isOwner && m.role !== "owner" && (
									<button
										type="button"
										className={styles.btnGhostSm}
										onClick={() => handleRemoveMember(m.user_id)}
									>
										Remove
									</button>
								)}
							</div>
						))}
					</div>
				</div>

				{isOwner && (
					<div className={styles.card}>
						<h2 className={styles.h2}>Invite members</h2>
						<div className={styles.row} style={{ marginBottom: "1rem" }}>
							<button
								type="button"
								className={
									inviteMode === "username"
										? styles.btnPrimarySm
										: styles.btnGhostSm
								}
								onClick={() => setInviteMode("username")}
							>
								By username
							</button>
							<button
								type="button"
								className={
									inviteMode === "email"
										? styles.btnPrimarySm
										: styles.btnGhostSm
								}
								onClick={() => setInviteMode("email")}
							>
								By email
							</button>
						</div>

						{inviteMode === "username" ? (
							<div className={styles.fieldGroup}>
								<label className={styles.label} htmlFor="invite-user">
									Search username
								</label>
								<input
									id="invite-user"
									className={styles.input}
									value={inviteQuery}
									onChange={(e) => handleSearchChange(e.target.value)}
									placeholder="farmgirl42"
								/>
								{inviteResults.length > 0 && (
									<div
										style={{
											background: "var(--surface-raised)",
											border: "1px solid var(--border)",
											borderRadius: "0.375rem",
											overflow: "hidden",
										}}
									>
										{inviteResults.map((u) => (
											<button
												key={u.id}
												type="button"
												onClick={() => handleInviteByUsername(u.id, u.username)}
												style={{
													display: "flex",
													alignItems: "center",
													gap: "0.5rem",
													width: "100%",
													padding: "0.625rem 0.875rem",
													background: "none",
													border: "none",
													cursor: "pointer",
													color: "var(--text)",
													textAlign: "left",
												}}
											>
												{u.avatar_url && (
													<img
														src={u.avatar_url}
														alt=""
														style={{
															width: "1.5rem",
															height: "1.5rem",
															borderRadius: "50%",
														}}
													/>
												)}
												{u.username}
											</button>
										))}
									</div>
								)}
							</div>
						) : (
							<form
								onSubmit={handleInviteByEmail}
								className={styles.fieldGroup}
							>
								<label className={styles.label} htmlFor="invite-email">
									Email address
								</label>
								<div className={styles.row}>
									<input
										id="invite-email"
										className={styles.input}
										type="email"
										value={inviteEmail}
										onChange={(e) => setInviteEmail(e.target.value)}
										placeholder="player@example.com"
									/>
									<button
										type="submit"
										className={styles.btnPrimary}
										disabled={!inviteEmail.trim()}
									>
										Send invite
									</button>
								</div>
								<span className={styles.hint}>
									If this player doesn't have an account yet, they'll receive an
									email with a sign-up link.
								</span>
							</form>
						)}

						{inviteStatus && (
							<p style={{ color: "var(--accent)", marginTop: "0.5rem" }}>
								{inviteStatus}
							</p>
						)}
					</div>
				)}
			</div>
		</>
	);
}
