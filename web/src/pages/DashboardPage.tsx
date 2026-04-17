import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import styles from "./shared.module.scss";

interface Farm {
	id: string;
	name: string;
	emoji: string | null;
	role: string;
}

interface Invitation {
	id: string;
	farm_name: string;
	farm_emoji: string | null;
	inviter_username: string;
	expires_at: string;
}

export function DashboardPage() {
	const { user } = useSession();
	const [farms, setFarms] = useState<Farm[]>([]);
	const [invitations, setInvitations] = useState<Invitation[]>([]);

	useEffect(() => {
		fetch("/api/farms")
			.then((r) => r.json())
			.then((d: { farms: Farm[] }) => setFarms(d.farms))
			.catch(console.error);
		fetch("/api/invitations/pending")
			.then((r) => r.json())
			.then((d: { invitations: Invitation[] }) => setInvitations(d.invitations))
			.catch(console.error);
	}, []);

	async function handleLogout() {
		await fetch("/auth/logout", { method: "POST" });
		window.location.href = "/";
	}

	return (
		<div className={styles.page}>
			<div className={styles.row} style={{ justifyContent: "space-between" }}>
				<div>
					<Link to="/" className={styles.hint}>
						← The Farm Computer
					</Link>
					<h1 className={styles.h1} style={{ marginTop: "0.25rem" }}>
						{user?.avatar_url && (
							<img
								src={user.avatar_url}
								alt=""
								style={{
									width: "2rem",
									height: "2rem",
									borderRadius: "50%",
									marginRight: "0.5rem",
									verticalAlign: "middle",
								}}
							/>
						)}
						{user?.username}
					</h1>
				</div>
				<button
					type="button"
					onClick={handleLogout}
					className={styles.btnGhost}
					style={{ alignSelf: "flex-start" }}
				>
					Sign out
				</button>
			</div>

			{invitations.length > 0 && (
				<div className={styles.card}>
					<h2 className={styles.h2}>Pending invitations</h2>
					<div className={styles.list}>
						{invitations.map((inv) => (
							<div key={inv.id} className={styles.listItem}>
								<div>
									<strong>
										{inv.farm_emoji ? `${inv.farm_emoji} ` : ""}
										{inv.farm_name}
									</strong>
									<span
										className={styles.hint}
										style={{ marginLeft: "0.5rem" }}
									>
										from {inv.inviter_username}
									</span>
								</div>
								<Link
									to={`/invitations/${inv.id}`}
									className={styles.btnPrimary}
									style={{ fontSize: "0.875rem", padding: "0.375rem 0.875rem" }}
								>
									View
								</Link>
							</div>
						))}
					</div>
				</div>
			)}

			<div className={styles.card}>
				<div
					className={styles.row}
					style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}
				>
					<h2 className={styles.h2} style={{ margin: 0 }}>
						My farms
					</h2>
					<Link
						to="/farms/new"
						className={styles.btnPrimary}
						style={{
							fontSize: "0.875rem",
							padding: "0.375rem 0.875rem",
							textDecoration: "none",
						}}
					>
						+ Add farm
					</Link>
				</div>
				{farms.length === 0 ? (
					<p className={styles.hint}>
						No farms yet. Add your first farm to start tracking bundle progress.
					</p>
				) : (
					<div className={styles.list}>
						{farms.map((farm) => (
							<div key={farm.id} className={styles.listItem}>
								<div>
									<strong>
										{farm.emoji ? `${farm.emoji} ` : ""}
										{farm.name}
									</strong>
									{farm.role === "owner" && (
										<span
											className={styles.hint}
											style={{ marginLeft: "0.5rem" }}
										>
											owner
										</span>
									)}
								</div>
								<div className={styles.row}>
									<Link
										to={`/farms/${farm.id}/bundles`}
										className={styles.btnGhost}
										style={{
											fontSize: "0.875rem",
											padding: "0.375rem 0.875rem",
											textDecoration: "none",
										}}
									>
										Bundles
									</Link>
									<Link
										to={`/farms/${farm.id}`}
										className={styles.btnGhost}
										style={{
											fontSize: "0.875rem",
											padding: "0.375rem 0.875rem",
											textDecoration: "none",
										}}
									>
										Manage
									</Link>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
