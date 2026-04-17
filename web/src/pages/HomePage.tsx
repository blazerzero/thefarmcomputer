import { useEffect, useState } from "react";
import { FaDiscord } from "react-icons/fa";
import { Link } from "react-router-dom";
import FarmComputerIcon from "@/assets/farm-computer.png";
import { CommandForm } from "../components/CommandForm";
import { CommandHelp } from "../components/CommandHelp";
import { EmbedCard } from "../components/EmbedCard";
import { GitHubBadge } from "../components/GitHubBadge";
import { useSession } from "../context/SessionContext";
import type { QueryResult } from "../types";
import styles from "./HomePage.module.scss";

function stripMarkdown(text: string): string {
	return text
		.replace(/\*\*/g, "")
		.replace(/\*/g, "")
		.replace(/__/g, "")
		.replace(/_/g, "");
}

const FULL_TITLE = "The Farm Computer";
const GITHUB_REPO = "blazerzero/thefarmcomputer";

export function HomePage() {
	const { user } = useSession();
	const [result, setResult] = useState<QueryResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [displayedTitle, setDisplayedTitle] = useState("");
	const [typing, setTyping] = useState(true);
	const [stars, setStars] = useState<number | null>(null);

	useEffect(() => {
		fetch(`https://api.github.com/repos/${GITHUB_REPO}`)
			.then((r) => r.json())
			.then((d: { stargazers_count?: number }) => {
				if (typeof d.stargazers_count === "number")
					setStars(d.stargazers_count);
			})
			.catch(console.error);
	}, []);

	useEffect(() => {
		let i = 0;
		const chars = [...FULL_TITLE];
		const interval = setInterval(() => {
			setDisplayedTitle(chars.slice(0, i + 1).join(""));
			i++;
			if (i >= chars.length) {
				clearInterval(interval);
				setTyping(false);
			}
		}, 80);
		return () => clearInterval(interval);
	}, []);

	async function handleSubmit(input: string) {
		setLoading(true);
		setResult(null);
		try {
			const res = await fetch(`/api/query?input=${encodeURIComponent(input)}`);
			const data = (await res.json()) as QueryResult;
			setResult(data);
		} catch {
			setResult({
				error:
					"Failed to reach the server. Make sure it's running and try again.",
			});
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className={styles.page}>
			<div className={styles.topRight}>
				<GitHubBadge
					repo={GITHUB_REPO}
					stars={stars}
					className={styles.githubBadge}
				/>
				{user ? (
					<Link to="/dashboard" className={styles.accountButton}>
						{user.avatar_url && (
							<img src={user.avatar_url} alt="" className={styles.avatar} />
						)}
						{user.username}
					</Link>
				) : (
					<a href="/auth/google/start" className={styles.signInButton}>
						Sign In
					</a>
				)}
			</div>

			<div className={styles.header}>
				<img
					src={FarmComputerIcon}
					alt="Old computer"
					className={styles.farmComputerIcon}
				/>
				<h1
					className={`${styles.title}${typing ? ` ${styles.titleTyping}` : ""}`}
				>
					{displayedTitle}
				</h1>
				<p className={styles.subtitle}>
					A nifty Discord bot and web tool for searching in-game details for
					Stardew Valley, sourced from the{" "}
					<a
						href="https://stardewvalleywiki.com"
						target="_blank"
						rel="noreferrer"
					>
						official wiki
					</a>
					.
				</p>
				<a
					href="https://discord.com/oauth2/authorize?client_id=1479385265327046677"
					target="_blank"
					rel="noreferrer"
					className={styles.discordButton}
				>
					<FaDiscord className={styles.discordIcon} aria-hidden="true" />
					Add to Discord
				</a>
			</div>

			<CommandForm onSubmit={handleSubmit} loading={loading} />

			{loading && <p className={styles.loading}>Loading…</p>}

			{result &&
				!loading &&
				(result.error ? (
					<div className={styles.error}>{stripMarkdown(result.error)}</div>
				) : result.embed ? (
					<EmbedCard embed={result.embed} />
				) : null)}

			<CommandHelp />

			<footer className={styles.footer}>
				<GitHubBadge repo={GITHUB_REPO} stars={stars} />
				<div className={styles.attributions}>
					<p>© {new Date().getFullYear()} Omeed Habibelahian</p>
					<a
						href="https://www.flaticon.com/free-icons/computer"
						title="computer icons"
					>
						Computer icons created by Freepik - Flaticon
					</a>
				</div>
			</footer>
		</div>
	);
}
