import styles from "../pages/shared.module.scss";

export interface AvatarUser {
	username: string;
	avatar_url: string | null;
}

interface AvatarStackProps {
	users: AvatarUser[];
	currentUsername?: string | null;
}

export function AvatarStack({ users, currentUsername }: AvatarStackProps) {
	if (users.length === 0) return null;
	return (
		<div className={styles.avatarStack}>
			{users.map((u) => (
				<div key={u.username} className={styles.avatarWrapper}>
					{u.avatar_url ? (
						<img src={u.avatar_url} alt="" className={styles.stackedAvatar} />
					) : (
						<div
							className={`${styles.stackedAvatar} ${styles.stackedAvatarFallback}`}
						>
							{u.username[0]?.toUpperCase()}
						</div>
					)}
					<span className={styles.avatarTooltip}>
						{u.username === currentUsername
							? `${u.username} (you)`
							: u.username}
					</span>
				</div>
			))}
		</div>
	);
}
