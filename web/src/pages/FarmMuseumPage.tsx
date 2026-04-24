import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { IoCheckmarkCircle } from "react-icons/io5";
import { Link, useParams } from "react-router-dom";
import { AvatarStack } from "../components/AvatarStack";
import { Navbar } from "../components/Navbar";
import { QueryPanel } from "../components/QueryPanel";
import { useSession } from "../context/SessionContext";
import pageStyles from "./FarmMuseumPage.module.scss";
import styles from "./shared.module.scss";

interface MuseumItem {
	id: number;
	name: string;
	description: string | null;
	image_url: string | null;
	wiki_url: string;
	donated: boolean;
	donated_by: string | null;
	donated_at: string | null;
}

interface ArtifactItem extends MuseumItem {
	location: string[];
}

interface MineralItem extends MuseumItem {
	category: string;
	source: string[];
}

interface MuseumData {
	artifacts: ArtifactItem[];
	minerals: MineralItem[];
}

interface ItemRowProps {
	item: MuseumItem;
	memberMap: Record<string, string | null>;
	onToggle: () => void;
}

interface ItemSectionProps {
	title: string;
	items: MuseumItem[];
	memberMap: Record<string, string | null>;
	onToggle: (item: MuseumItem, itemType: "artifact" | "mineral") => void;
}

interface MineralSectionProps {
	minerals: MineralItem[];
	memberMap: Record<string, string | null>;
	onToggle: (item: MuseumItem, itemType: "artifact" | "mineral") => void;
}

function ItemRow({ item, memberMap, onToggle }: ItemRowProps) {
	return (
		<button
			type="button"
			className={`${pageStyles.item} ${item.donated ? pageStyles.itemDonated : ""}`}
			onClick={onToggle}
			title={item.donated ? undefined : "Mark as donated"}
		>
			<span className={pageStyles.itemCheck}>{item.donated ? "✓" : ""}</span>
			{item.image_url && (
				<img src={item.image_url} alt="" className={pageStyles.itemThumb} />
			)}
			<span className={pageStyles.itemName}>{item.name}</span>
			{item.donated && item.donated_by && (
				<AvatarStack
					users={[
						{
							username: item.donated_by,
							avatar_url: memberMap[item.donated_by] ?? null,
						},
					]}
				/>
			)}
		</button>
	);
}

function ItemSection({ title, items, memberMap, onToggle }: ItemSectionProps) {
	const [collapsed, setCollapsed] = useState(false);
	const donatedCount = items.filter((i) => i.donated).length;
	const complete = donatedCount === items.length;

	// Auto-collapse when complete
	useEffect(() => {
		if (complete) setCollapsed(true);
	}, [complete]);

	if (items.length === 0) return null;
	const itemType = "category" in items[0]! ? "mineral" : "artifact";

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
						{donatedCount}/{items.length}
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
							onToggle={() => onToggle(item, itemType)}
						/>
					))}
				</div>
			</motion.div>
		</motion.div>
	);
}

function MineralSection({
	minerals,
	memberMap,
	onToggle,
}: MineralSectionProps) {
	const [collapsed, setCollapsed] = useState(false);
	const donatedCount = minerals.filter((m) => m.donated).length;
	const complete = donatedCount === minerals.length;

	useEffect(() => {
		if (complete) setCollapsed(true);
	}, [complete]);

	const byCategory = minerals.reduce<Record<string, MineralItem[]>>(
		(acc, m) => {
			(acc[m.category] ??= []).push(m);
			return acc;
		},
		{},
	);

	const categoryOrder = ["Foraged Mineral", "Gem", "Geode"];
	const sortedCategories = [
		...categoryOrder.filter((c) => byCategory[c]),
		...Object.keys(byCategory).filter((c) => !categoryOrder.includes(c)),
	];

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
					Minerals
					{complete && (
						<IoCheckmarkCircle className={pageStyles.completeMark} />
					)}
				</h2>
				<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
					<span className={pageStyles.sectionProgress}>
						{donatedCount}/{minerals.length}
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
				<div style={{ paddingTop: "0.75rem" }}>
					{sortedCategories.map((category) => (
						<div key={category}>
							<div className={pageStyles.categoryLabel}>{category}</div>
							<div className={pageStyles.itemList}>
								{byCategory[category]?.map((item) => (
									<ItemRow
										key={item.id}
										item={item}
										memberMap={memberMap}
										onToggle={() => onToggle(item, "mineral")}
									/>
								))}
							</div>
						</div>
					))}
				</div>
			</motion.div>
		</motion.div>
	);
}

interface Member {
	username: string;
	avatar_url: string | null;
}

export function FarmMuseumPage() {
	const { farmId } = useParams<{ farmId: string }>();
	const { user } = useSession();
	const [data, setData] = useState<MuseumData | null>(null);
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
		fetch(`/api/farms/${farmId}/museum`)
			.then((r) => r.json())
			.then((d: MuseumData) => {
				setData(d);
				setLoading(false);
			});
	}, [farmId]);

	async function toggleItem(
		item: MuseumItem,
		itemType: "artifact" | "mineral",
	) {
		if (!farmId) return;
		const endpoint = `/api/farms/${farmId}/museum/${itemType}/${item.id}`;
		const method = item.donated ? "DELETE" : "POST";
		await fetch(endpoint, { method });

		if (!item.donated) {
			toast.success(item.name, { duration: 2000 });
		}

		setData((prev) => {
			if (!prev) return prev;
			if (itemType === "artifact") {
				return {
					...prev,
					artifacts: prev.artifacts.map((a) =>
						a.id !== item.id
							? a
							: {
									...a,
									donated: !item.donated,
									donated_by: item.donated ? null : (user?.username ?? null),
									donated_at: item.donated ? null : new Date().toISOString(),
								},
					),
				};
			}
			return {
				...prev,
				minerals: prev.minerals.map((m) =>
					m.id !== item.id
						? m
						: {
								...m,
								donated: !item.donated,
								donated_by: item.donated ? null : (user?.username ?? null),
								donated_at: item.donated ? null : new Date().toISOString(),
							},
				),
			};
		});
	}

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
						<span>Museum</span>
					</nav>
					<h1 className={styles.h1} style={{ marginTop: "0.25rem" }}>
						Museum donations
					</h1>
				</div>

				<div className={pageStyles.layout}>
					<main className={pageStyles.main}>
						{loading || !data ? (
							<p className={styles.hint}>Loading museum…</p>
						) : (
							<>
								<ItemSection
									title="Artifacts"
									items={data.artifacts}
									memberMap={memberMap}
									onToggle={toggleItem}
								/>
								<MineralSection
									minerals={data.minerals}
									memberMap={memberMap}
									onToggle={toggleItem}
								/>
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
