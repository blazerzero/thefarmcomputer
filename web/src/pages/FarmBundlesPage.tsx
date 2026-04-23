import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { IoCheckmarkCircle } from "react-icons/io5";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { QueryPanel } from "../components/QueryPanel";
import { useSession } from "../context/SessionContext";
import pageStyles from "./FarmBundlesPage.module.scss";
import styles from "./shared.module.scss";

interface BundleItem {
	index: number;
	name: string;
	quantity: number;
	quality: string | null;
	checked: boolean;
	checked_by: string | null;
	checked_at: string | null;
}

interface Bundle {
	id: number;
	name: string;
	room: string;
	items_required: number;
	reward: string;
	description: string | null;
	image_url: string | null;
	items: BundleItem[];
	items_checked: number;
	complete: boolean;
}

function BundleRoomGrid({
	bundles,
	onToggle,
	currentUsername,
}: {
	bundles: Bundle[];
	onToggle: (bundle: Bundle, item: BundleItem) => void;
	currentUsername: string | null;
}) {
	const sorted = [...bundles].sort(
		(a, b) => Number(a.complete) - Number(b.complete),
	);

	return (
		<div className={pageStyles.bundleGrid}>
			{sorted.map((bundle) => (
				<motion.div
					key={bundle.id}
					layout
					transition={{ duration: 0.5, ease: "easeInOut" }}
					className={`${pageStyles.bundle} ${bundle.complete ? pageStyles.complete : ""}`}
				>
					<div className={pageStyles.bundleHeader}>
						<span className={pageStyles.bundleName}>
							{bundle.name}
							{bundle.complete && (
								<IoCheckmarkCircle className={pageStyles.completeMark} />
							)}
						</span>
						<span className={pageStyles.bundleProgress}>
							{bundle.items_checked}/{bundle.items_required}
						</span>
					</div>
					{bundle.description && (
						<p className={pageStyles.bundleDescription}>{bundle.description}</p>
					)}
					{bundle.items_required < bundle.items.length && (
						<p className={pageStyles.bundleChoiceHint}>
							Choose any {bundle.items_required} of {bundle.items.length}
						</p>
					)}
					<div className={pageStyles.bundleItems}>
						{bundle.items.map((item) => (
							<button
								key={item.index}
								type="button"
								className={`${pageStyles.item} ${item.checked ? pageStyles.itemChecked : ""}`}
								onClick={() => onToggle(bundle, item)}
								title={
									item.checked
										? `Added by ${item.checked_by === currentUsername ? "you" : item.checked_by}`
										: "Mark as added"
								}
							>
								<span className={pageStyles.itemCheck}>
									{item.checked ? "✓" : ""}
								</span>
								<span className={pageStyles.itemName}>
									{item.name}
									{item.quantity > 1 && (
										<span className={pageStyles.itemQty}>
											{" "}
											×{item.quantity}
										</span>
									)}
									{item.quality && (
										<span className={pageStyles.itemQuality}>
											{" "}
											({item.quality})
										</span>
									)}
								</span>
								{item.checked && item.checked_by && (
									<span className={pageStyles.itemBy}>
										{item.checked_by === currentUsername
											? "you"
											: item.checked_by}
									</span>
								)}
							</button>
						))}
					</div>
					{bundle.reward && (
						<div className={pageStyles.reward}>Reward: {bundle.reward}</div>
					)}
				</motion.div>
			))}
		</div>
	);
}

export function FarmBundlesPage() {
	const { farmId } = useParams<{ farmId: string }>();
	const { user } = useSession();
	const [bundles, setBundles] = useState<Bundle[]>([]);
	const [farmName, setFarmName] = useState("");
	const [loading, setLoading] = useState(true);
	const [collapsedRooms, setCollapsedRooms] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (!farmId) return;
		fetch(`/api/farms/${farmId}`)
			.then((r) => r.json())
			.then((d: { farm: { name: string; emoji: string | null } }) => {
				setFarmName(
					d.farm.emoji ? `${d.farm.emoji} ${d.farm.name}` : d.farm.name,
				);
			});
		fetch(`/api/farms/${farmId}/bundles`)
			.then((r) => r.json())
			.then((d: { bundles: Bundle[] }) => {
				setBundles(d.bundles);
				setLoading(false);
				const roomNames = [...new Set(d.bundles.map((b) => b.room))];
				setCollapsedRooms(
					new Set(
						roomNames.filter((room) =>
							d.bundles.filter((b) => b.room === room).every((b) => b.complete),
						),
					),
				);
			});
	}, [farmId]);

	function toggleRoom(room: string) {
		setCollapsedRooms((prev) => {
			const next = new Set(prev);
			if (next.has(room)) next.delete(room);
			else next.add(room);
			return next;
		});
	}

	async function toggleItem(bundle: Bundle, item: BundleItem) {
		if (!farmId) return;
		const endpoint = `/api/farms/${farmId}/bundles/${bundle.id}/items/${item.index}`;
		const method = item.checked ? "DELETE" : "POST";
		await fetch(endpoint, { method });

		// Detect item check and bundle completion before updating state
		if (!item.checked) {
			toast.success(item.name, { duration: 2000 });
			const newCount = bundle.items_checked + 1;
			if (newCount >= bundle.items_required && !bundle.complete) {
				toast.success(`${bundle.name} complete! 🎉`, { duration: 4000 });
			}
		}

		setBundles((prev) =>
			prev.map((b) => {
				if (b.id !== bundle.id) return b;
				const newItems = b.items.map((i) =>
					i.index !== item.index
						? i
						: {
								...i,
								checked: !item.checked,
								checked_by: item.checked ? null : "you",
								checked_at: item.checked ? null : new Date().toISOString(),
							},
				);
				const checkedCount = newItems.filter((i) => i.checked).length;
				return {
					...b,
					items: newItems,
					items_checked: checkedCount,
					complete: checkedCount >= b.items_required,
				};
			}),
		);
	}

	const rooms = [...new Set(bundles.map((b) => b.room))].sort((a, b) => {
		const aComplete = bundles
			.filter((b2) => b2.room === a)
			.every((b2) => b2.complete);
		const bComplete = bundles
			.filter((b2) => b2.room === b)
			.every((b2) => b2.complete);
		return Number(aComplete) - Number(bComplete);
	});

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
						<span>Bundles</span>
					</nav>
					<h1 className={styles.h1} style={{ marginTop: "0.25rem" }}>
						Bundle progress
					</h1>
				</div>

				<div className={pageStyles.layout}>
					<main className={pageStyles.main}>
						{loading ? (
							<p className={styles.hint}>Loading bundles…</p>
						) : (
							rooms.map((room) => {
								const collapsed = collapsedRooms.has(room);
								const roomComplete = bundles
									.filter((b) => b.room === room)
									.every((b) => b.complete);
								return (
									<motion.div
										key={room}
										layout
										transition={{ duration: 0.5, ease: "easeInOut" }}
										className={`${styles.card} ${roomComplete ? pageStyles.roomComplete : ""}`}
									>
										<button
											type="button"
											className={pageStyles.roomHeader}
											onClick={() => toggleRoom(room)}
										>
											<h2
												className={styles.h2}
												style={{
													margin: 0,
													display: "flex",
													alignItems: "center",
												}}
											>
												{room}
												{roomComplete && (
													<IoCheckmarkCircle
														className={pageStyles.completeMark}
													/>
												)}
											</h2>
											<span
												className={pageStyles.roomChevron}
												style={{
													transform: collapsed
														? "rotate(-90deg)"
														: "rotate(0deg)",
												}}
											>
												▾
											</span>
										</button>
										<motion.div
											initial={false}
											animate={{ height: collapsed ? 0 : "auto" }}
											transition={{ duration: 0.3, ease: "easeInOut" }}
											style={{ overflow: "hidden" }}
										>
											<div style={{ paddingTop: "0.75rem" }}>
												<BundleRoomGrid
													bundles={bundles.filter((b) => b.room === room)}
													onToggle={toggleItem}
													currentUsername={user?.username ?? null}
												/>
											</div>
										</motion.div>
									</motion.div>
								);
							})
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
