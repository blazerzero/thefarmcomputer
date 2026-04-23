import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { Navbar } from "../components/Navbar";
import { useSession } from "../context/SessionContext";
import { useSignOut } from "../hooks/useSignOut";
import pageStyles from "./DashboardPage.module.scss";
import styles from "./shared.module.scss";

interface Farm {
	id: string;
	name: string;
	emoji: string | null;
	role: string;
	member_avatars: (string | null)[];
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
	const handleSignOut = useSignOut();
	const [farms, setFarms] = useState<Farm[]>([]);
	const [invitations, setInvitations] = useState<Invitation[]>([]);
	const [confirmSignOut, setConfirmSignOut] = useState(false);

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

	return (
		<>
			<Navbar />
			<div className={styles.page}>
				<div className={styles.row} style={{ justifyContent: "space-between" }}>
					<div>
						<h1 className={styles.h1}>
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
						onClick={() => setConfirmSignOut(true)}
						className={styles.btnGhost}
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
										className={styles.btnPrimarySm}
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
						<Link to="/farms/new" className={styles.btnPrimarySm}>
							+ Add farm
						</Link>
					</div>
					{farms.length === 0 ? (
						<p className={styles.hint}>
							No farms yet. Add your first farm to start tracking bundle
							progress.
						</p>
					) : (
						<div className={styles.list}>
							{farms.map((farm) => (
								<Link
									key={farm.id}
									to={`/farms/${farm.id}`}
									className={`${styles.listItem} ${pageStyles.farmItem}`}
									style={{ textDecoration: "none", color: "inherit" }}
								>
									<div className={styles.row} style={{ gap: "0.75rem" }}>
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
										{farm.member_avatars.length > 1 && (
											<div className={styles.avatarStack}>
												{farm.member_avatars.slice(0, 5).map((url, i) =>
													url ? (
														<img
															key={i}
															src={url}
															alt=""
															className={styles.stackedAvatar}
															style={{
																zIndex: farm.member_avatars.length - i,
															}}
														/>
													) : (
														<div
															key={i}
															className={`${styles.stackedAvatar} ${styles.stackedAvatarFallback}`}
															style={{
																zIndex: farm.member_avatars.length - i,
															}}
														/>
													),
												)}
												{farm.member_avatars.length > 5 && (
													<span className={styles.avatarOverflow}>
														+{farm.member_avatars.length - 5}
													</span>
												)}
											</div>
										)}
									</div>
								</Link>
							))}
						</div>
					)}
				</div>
			</div>

			<ConfirmModal
				isOpen={confirmSignOut}
				title="Sign out?"
				message="Are you sure you want to sign out?"
				confirmLabel="Sign out"
				onConfirm={handleSignOut}
				onCancel={() => setConfirmSignOut(false)}
			/>
		</>
	);
}
