import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import styles from "./shared.module.scss";

interface InvitationInfo {
	id: string;
	farm_name: string;
	farm_emoji: string | null;
	inviter_username: string;
	status: string;
	expires_at: string;
}

export function InvitationPage() {
	const { id } = useParams<{ id: string }>();
	const { user, loading: sessionLoading } = useSession();
	const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
	const [loadError, setLoadError] = useState(false);
	const [actionStatus, setActionStatus] = useState<
		"idle" | "accepting" | "declining" | "accepted" | "declined" | "error"
	>("idle");

	useEffect(() => {
		if (!id) return;
		fetch(`/api/invitations/${id}`)
			.then((r) => {
				if (!r.ok) throw new Error("not_found");
				return r.json() as Promise<InvitationInfo>;
			})
			.then(setInvitation)
			.catch(() => setLoadError(true));
	}, [id]);

	async function handleAccept() {
		if (!id) return;
		setActionStatus("accepting");
		const res = await fetch(`/api/invitations/${id}/accept`, {
			method: "POST",
		});
		const data = (await res.json()) as { ok: boolean; farm_id?: string };
		if (data.ok) {
			setActionStatus("accepted");
		} else {
			setActionStatus("error");
		}
	}

	async function handleDecline() {
		if (!id) return;
		setActionStatus("declining");
		const res = await fetch(`/api/invitations/${id}/decline`, {
			method: "POST",
		});
		const data = (await res.json()) as { ok: boolean };
		setActionStatus(data.ok ? "declined" : "error");
	}

	if (loadError) {
		return (
			<div className={styles.page}>
				<h1 className={styles.h1}>Invitation not found</h1>
				<p style={{ color: "var(--text-muted)" }}>
					This invitation link is invalid or has expired.
				</p>
			</div>
		);
	}

	if (!invitation) return null;

	const displayName = invitation.farm_emoji
		? `${invitation.farm_emoji} ${invitation.farm_name}`
		: invitation.farm_name;

	return (
		<div className={styles.page}>
			<h1 className={styles.h1}>Farm invitation</h1>

			<div
				className={styles.card}
				style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
			>
				<p style={{ fontSize: "1.125rem" }}>
					<strong>{invitation.inviter_username}</strong> has invited you to join{" "}
					<strong>{displayName}</strong>.
				</p>

				{invitation.status !== "pending" && (
					<p className={styles.hint}>
						This invitation has already been {invitation.status}.
					</p>
				)}

				{invitation.status === "pending" && !sessionLoading && (
					<>
						{!user ? (
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "0.75rem",
								}}
							>
								<p style={{ color: "var(--text-muted)" }}>
									Sign in to accept or decline this invitation.
								</p>
								<a
									href={`/auth/google/start?redirect=/invitations/${id}`}
									className={styles.btnPrimary}
									style={{ textDecoration: "none" }}
								>
									Sign in with Google
								</a>
							</div>
						) : actionStatus === "accepted" ? (
							<div>
								<p style={{ color: "var(--accent)" }}>
									You joined the farm! 🎉
								</p>
								<a href="/dashboard" style={{ color: "var(--text-link)" }}>
									Go to your dashboard →
								</a>
							</div>
						) : actionStatus === "declined" ? (
							<p style={{ color: "var(--text-muted)" }}>Invitation declined.</p>
						) : actionStatus === "error" ? (
							<p className={styles.error}>
								Something went wrong. Please try again.
							</p>
						) : (
							<div className={styles.row}>
								<button
									type="button"
									className={styles.btnPrimary}
									onClick={handleAccept}
									disabled={actionStatus === "accepting"}
								>
									{actionStatus === "accepting"
										? "Joining…"
										: "Accept invitation"}
								</button>
								<button
									type="button"
									className={styles.btnGhost}
									onClick={handleDecline}
									disabled={actionStatus === "declining"}
								>
									{actionStatus === "declining" ? "Declining…" : "Decline"}
								</button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
