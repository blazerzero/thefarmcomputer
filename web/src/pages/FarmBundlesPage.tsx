import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styles from "./shared.module.scss";
import pageStyles from "./FarmBundlesPage.module.scss";

interface BundleItem {
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
		const endpoint = `/api/farms/${farmId}/bundles/${bundle.id}/items/${encodeURIComponent(item.name)}`;
		const method = item.checked ? "DELETE" : "POST";
		await fetch(endpoint, { method });
		setBundles((prev) =>
			prev.map((b) =>
				b.id !== bundle.id
					? b
					: {
							...b,
							items: b.items.map((i) =>
								i.name !== item.name
									? i
									: {
											...i,
											checked: !item.checked,
											checked_by: item.checked ? null : "you",
											checked_at: item.checked
												? null
												: new Date().toISOString(),
										},
							),
							items_checked: b.items_checked + (item.checked ? -1 : 1),
							complete:
								b.items_checked + (item.checked ? -1 : 1) >= b.items_required,
						},
			),
		);
	}

	// Group bundles by room
	const rooms = [...new Set(bundles.map((b) => b.room))];

	return (
		<div className={styles.page}>
			<nav className={styles.nav}>
				<Link to="/dashboard">Dashboard</Link>
				<span className={styles.sep}>›</span>
				<Link to={`/farms/${farmId}`}>{farmName}</Link>
				<span className={styles.sep}>›</span>
				<span>Bundles</span>
			</nav>

			<h1 className={styles.h1}>Bundle progress</h1>

			{loading ? (
				<p className={styles.hint}>Loading bundles…</p>
			) : (
				rooms.map((room) => (
					<div key={room} className={styles.card}>
						<h2 className={styles.h2}>{room}</h2>
						<div className={pageStyles.bundleGrid}>
							{bundles
								.filter((b) => b.room === room)
								.map((bundle) => (
									<div
										key={bundle.id}
										className={`${pageStyles.bundle} ${bundle.complete ? pageStyles.complete : ""}`}
									>
										<div className={pageStyles.bundleHeader}>
											<span className={pageStyles.bundleName}>
												{bundle.name}
											</span>
											<span className={pageStyles.bundleProgress}>
												{bundle.items_checked}/{bundle.items_required}
											</span>
										</div>
										<div className={pageStyles.bundleItems}>
											{bundle.items.map((item) => (
												<button
													key={item.name}
													type="button"
													className={`${pageStyles.item} ${item.checked ? pageStyles.itemChecked : ""}`}
													onClick={() => toggleItem(bundle, item)}
													title={
														item.checked
															? `Added by ${item.checked_by}`
															: `Mark as added`
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
															{item.checked_by}
														</span>
													)}
												</button>
											))}
										</div>
										{bundle.reward && (
											<div className={pageStyles.reward}>
												Reward: {bundle.reward}
											</div>
										)}
									</div>
								))}
						</div>
					</div>
				))
			)}
		</div>
	);
}
