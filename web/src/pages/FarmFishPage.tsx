import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { IoCheckmarkCircle } from "react-icons/io5";
import { Link, useParams } from "react-router-dom";
import { AvatarStack, type AvatarUser } from "../components/AvatarStack";
import { Navbar } from "../components/Navbar";
import { QueryPanel } from "../components/QueryPanel";
import { useSession } from "../context/SessionContext";
import pageStyles from "./FarmFishPage.module.scss";
import styles from "./shared.module.scss";

interface FishItem {
	id: number;
	name: string;
	category: string;
	location: string;
	time: string | null;
	seasons: string[];
	weather: string | null;
	difficulty: number | null;
	sell_price: number | null;
	image_url: string | null;
	wiki_url: string;
	caught_by_me: boolean;
	caught_by_me_at: string | null;
	also_caught_by: string[];
}

interface FishData {
	fish: FishItem[];
}

interface ItemRowProps {
	item: FishItem;
	memberMap: Record<string, string | null>;
	currentUsername: string | null;
	onToggle: () => void;
}

interface ItemSectionProps {
	title: string;
	items: FishItem[];
	memberMap: Record<string, string | null>;
	currentUsername: string | null;
	onToggle: (item: FishItem) => void;
}

function ItemRow({ item, memberMap, currentUsername, onToggle }: ItemRowProps) {
	const alsoUsers: AvatarUser[] = item.also_caught_by.map((u) => ({
		username: u,
		avatar_url: memberMap[u] ?? null,
	}));

	return (
		<button
			type="button"
			className={`${pageStyles.item} ${item.caught_by_me ? pageStyles.itemCaught : ""}`}
			onClick={onToggle}
			title={item.caught_by_me ? "Mark as not caught" : "Mark as caught"}
		>
			<span className={pageStyles.itemCheck}>
				{item.caught_by_me ? "✓" : ""}
			</span>
			{item.image_url && (
				<img src={item.image_url} alt="" className={pageStyles.itemThumb} />
			)}
			<span className={pageStyles.itemName}>{item.name}</span>
			{alsoUsers.length > 0 && (
				<AvatarStack users={alsoUsers} currentUsername={currentUsername} />
			)}
		</button>
	);
}

function ItemSection({
	title,
	items,
	memberMap,
	currentUsername,
	onToggle,
}: ItemSectionProps) {
	const [collapsed, setCollapsed] = useState(false);
	const caughtCount = items.filter((i) => i.caught_by_me).length;
	const complete = caughtCount === items.length;

	useEffect(() => {
		if (complete) setCollapsed(true);
	}, [complete]);

	if (items.length === 0) return null;

	return (
		<motion.div
			layout
			transition={{ duration: 0.5, ease: "easeInOut" }}
			className={`${styles.card} ${complete ? pageStyles.sectionComplete : ""}`}
		>
			<button
				type="button"
				className={pageStyles.sectionHeader}
				onClick={() => setCollapsed((c) => !c)}
			>
				<h2
					className={styles.h2}
					style={{ margin: 0, display: "flex", alignItems: "center" }}
				>
					{title}
					{complete && (
						<IoCheckmarkCircle className={pageStyles.completeMark} />
					)}
				</h2>
				<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
					<span className={pageStyles.sectionProgress}>
						{caughtCount}/{items.length}
					</span>
					<span
						className={pageStyles.sectionChevron}
						style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
					>
						▾
					</span>
				</div>
			</button>
			<motion.div
				initial={false}
				animate={{ height: collapsed ? 0 : "auto" }}
				transition={{ duration: 0.3, ease: "easeInOut" }}
				style={{ overflow: "hidden" }}
			>
				<div className={pageStyles.itemList} style={{ paddingTop: "0.75rem" }}>
					{items.map((item) => (
						<ItemRow
							key={item.id}
							item={item}
							memberMap={memberMap}
							currentUsername={currentUsername}
							onToggle={() => onToggle(item)}
						/>
					))}
				</div>
			</motion.div>
		</motion.div>
	);
}

const CATEGORY_ORDER = [
	"Fishing Pole",
	"Crab Pot",
	"Night Market",
	"Legendary",
	"Legendary II",
];

interface Member {
	username: string;
	avatar_url: string | null;
}

export function FarmFishPage() {
	const { farmId } = useParams<{ farmId: string }>();
	const { user } = useSession();
	const [data, setData] = useState<FishData | null>(null);
	const [farmName, setFarmName] = useState("");
	const [loading, setLoading] = useState(true);
	const [memberMap, setMemberMap] = useState<Record<string, string | null>>({});

	useEffect(() => {
		if (!farmId) return;
		fetch(`/api/farms/${farmId}`)
			.then((r) => r.json())
			.then((d: { farm: { name: string; emoji: string | null } }) => {
				setFarmName(
					d.farm.emoji ? `${d.farm.emoji} ${d.farm.name}` : d.farm.name,
				);
			});
		fetch(`/api/farms/${farmId}/members`)
			.then((r) => r.json())
			.then((d: { members: Member[] }) => {
				const map: Record<string, string | null> = {};
				for (const m of d.members) map[m.username] = m.avatar_url;
				setMemberMap(map);
			});
		fetch(`/api/farms/${farmId}/fish`)
			.then((r) => r.json())
			.then((d: FishData) => {
				setData(d);
				setLoading(false);
			});
	}, [farmId]);

	async function toggleFish(item: FishItem) {
		if (!farmId) return;
		const endpoint = `/api/farms/${farmId}/fish/${item.id}`;
		const method = item.caught_by_me ? "DELETE" : "POST";
		await fetch(endpoint, { method });

		if (!item.caught_by_me) {
			toast.success(item.name, { duration: 2000 });
		}

		setData((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				fish: prev.fish.map((f) =>
					f.id !== item.id
						? f
						: {
								...f,
								caught_by_me: !item.caught_by_me,
								caught_by_me_at: item.caught_by_me
									? null
									: new Date().toISOString(),
							},
				),
			};
		});
	}

	const byCategory = (data?.fish ?? []).reduce<Record<string, FishItem[]>>(
		(acc, f) => {
			(acc[f.category] ??= []).push(f);
			return acc;
		},
		{},
	);

	const sortedCategories = [
		...CATEGORY_ORDER.filter((c) => byCategory[c]),
		...Object.keys(byCategory).filter((c) => !CATEGORY_ORDER.includes(c)),
	];

	return (
		<>
			<Navbar />
			<div className={pageStyles.pageWrapper}>
				<div className={pageStyles.pageHeader}>
					<nav className={styles.nav}>
						<Link to="/dashboard">My farms</Link>
						<span className={styles.sep}>›</span>
						<Link to={`/farms/${farmId}`}>{farmName || "Farm"}</Link>
						<span className={styles.sep}>›</span>
						<span>Fish</span>
					</nav>
					<h1 className={styles.h1} style={{ marginTop: "0.25rem" }}>
						Fish caught
					</h1>
				</div>

				<div className={pageStyles.layout}>
					<main className={pageStyles.main}>
						{loading || !data ? (
							<p className={styles.hint}>Loading fish…</p>
						) : (
							<>
								{sortedCategories.map((category) => (
									<ItemSection
										key={category}
										title={category}
										items={byCategory[category] ?? []}
										memberMap={memberMap}
										currentUsername={user?.username ?? null}
										onToggle={toggleFish}
									/>
								))}
							</>
						)}
					</main>

					<aside className={pageStyles.sidebar}>
						<QueryPanel />
					</aside>
				</div>
			</div>
		</>
	);
}
