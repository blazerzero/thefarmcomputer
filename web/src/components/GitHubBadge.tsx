import { FaGithub, FaStar } from "react-icons/fa";
import styles from "./GitHubBadge.module.scss";

interface GitHubBadgeProps {
	repo: string;
	stars: number | null;
	className?: string;
}

export function GitHubBadge({ repo, stars, className }: GitHubBadgeProps) {
	return (
		<a
			href={`https://github.com/${repo}`}
			target="_blank"
			rel="noreferrer"
			className={`${styles.badge}${className ? ` ${className}` : ""}`}
			aria-label="View on GitHub"
		>
			<FaGithub className={styles.icon} aria-hidden="true" />
			<span className={styles.stars}>
				<FaStar aria-hidden="true" />
				{stars !== null ? stars.toLocaleString() : "—"}
			</span>
		</a>
	);
}
