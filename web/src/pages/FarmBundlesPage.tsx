import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Navbar } from "../components/Navbar";
import { QueryPanel } from "../components/QueryPanel";
import styles from "./shared.module.scss";
import pageStyles from "./FarmBundlesPage.module.scss";

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
	image_url: string | null;
	items: BundleItem[];
	items_checked: number;
	complete: boolean;
}

function BundleRoomGrid({
	bundles,
	onToggle,
}: {
	bundles: Bundle[];
	onToggle: (bundle: Bundle, item: BundleItem) => void;
}) {
	const [parent] = useAutoAnimate<HTMLDivElement>();
	const sorted = [...bundles].sort(
		(a, b) => Number(a.complete) - Number(b.complete),
	);

	return (
		<div ref={parent} className={pageStyles.bundleGrid}>
			{sorted.map((bundle) => (
				<div
					key={bundle.id}
					className={`${pageStyles.bundle} ${bundle.complete ? pageStyles.complete : ""}`}
				>
					<div className={pageStyles.bundleHeader}>
						<span className={pageStyles.bundleName}>{bundle.name}</span>
						<span className={pageStyles.bundleProgress}>
							{bundle.items_checked}/{bundle.items_required}
						</span>
					</div>
					<div className={pageStyles.bundleItems}>
						{bundle.items.map((item) => (
							<button
								key={item.index}
								type="button"
								className={`${pageStyles.item} ${item.checked ? pageStyles.itemChecked : ""}`}
								onClick={() => onToggle(bundle, item)}
								title={
									item.checked ? `Added by ${item.checked_by}` : "Mark as added"
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
									<span className={pageStyles.itemBy}>{item.checked_by}</span>
								)}
							</button>
						))}
					</div>
					{bundle.reward && (
						<div className={pageStyles.reward}>Reward: {bundle.reward}</div>
					)}
				</div>
			))}
		</div>
	);
}

export function FarmBundlesPage() {
	const { farmId } = useParams<{ farmId: string }>();
	const [bundles, setBundles] = useState<Bundle[]>([]);
	const [farmName, setFarmName] = useState("");
	const [loading, setLoading] = useState(true);

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
			});
	}, [farmId]);

	async function toggleItem(bundle: Bundle, item: BundleItem) {
		if (!farmId) return;
		const endpoint = `/api/farms/${farmId}/bundles/${bundle.id}/items/${item.index}`;
		const method = item.checked ? "DELETE" : "POST";
		await fetch(endpoint, { method });

		// Detect bundle completion before updating state
		if (!item.checked) {
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

	const rooms = [...new Set(bundles.map((b) => b.room))];

	return (
		<>
			<Navbar />
			<div className={pageStyles.layout}>
				<main className={pageStyles.main}>
					<div>
						<nav className={styles.nav}>
							<Link to={`/farms/${farmId}`}>{farmName || "Farm"}</Link>
							<span className={styles.sep}>›</span>
							<span>Bundles</span>
						</nav>
						<h1 className={styles.h1} style={{ marginTop: "0.25rem" }}>
							Bundle progress
						</h1>
					</div>

					{loading ? (
						<p className={styles.hint}>Loading bundles…</p>
					) : (
						rooms.map((room) => (
							<div key={room} className={styles.card}>
								<h2 className={styles.h2}>{room}</h2>
								<BundleRoomGrid
									bundles={bundles.filter((b) => b.room === room)}
									onToggle={toggleItem}
								/>
							</div>
						))
					)}
				</main>

				<aside className={pageStyles.sidebar}>
					<QueryPanel />
				</aside>
			</div>
		</>
	);
}
