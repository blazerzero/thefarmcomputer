export function getStatus(sql: SqlStorage): {
	cropCount: number;
	villagerCount: number;
	fruitTreeCount: number;
	fishCount: number;
	bundleCount: number;
	forageableCount: number;
	mineralCount: number;
	craftedItemCount: number;
	monsterCount: number;
	weaponCount: number;
	cropsLastUpdated: string | null;
	villagersLastUpdated: string | null;
	fruitTreesLastUpdated: string | null;
	fishLastUpdated: string | null;
	bundlesLastUpdated: string | null;
	forageablesLastUpdated: string | null;
	mineralsLastUpdated: string | null;
	craftedItemsLastUpdated: string | null;
	monstersLastUpdated: string | null;
	weaponsLastUpdated: string | null;
} {
	const cropRow = sql
		.exec("SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM crops")
		.one() as { n: number; last_updated: string | null } | null;
	const villagerRow = sql
		.exec(
			"SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM villagers",
		)
		.one() as { n: number; last_updated: string | null } | null;
	const fruitTreeRow = sql
		.exec(
			"SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM fruit_trees",
		)
		.one() as { n: number; last_updated: string | null } | null;
	const fishRow = sql
		.exec("SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM fish")
		.one() as { n: number; last_updated: string | null } | null;
	const bundleRow = sql
		.exec(
			"SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM bundles",
		)
		.one() as { n: number; last_updated: string | null } | null;
	const forageableRow = sql
		.exec(
			"SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM forageables",
		)
		.one() as { n: number; last_updated: string | null } | null;
	const mineralRow = sql
		.exec(
			"SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM minerals",
		)
		.one() as { n: number; last_updated: string | null } | null;
	const craftedItemRow = sql
		.exec(
			"SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM crafted_items",
		)
		.one() as { n: number; last_updated: string | null } | null;
	const monsterRow = sql
		.exec(
			"SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM monsters",
		)
		.one() as { n: number; last_updated: string | null } | null;
	const weaponRow = sql
		.exec(
			"SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM weapons",
		)
		.one() as { n: number; last_updated: string | null } | null;
	return {
		cropCount: cropRow?.n ?? 0,
		villagerCount: villagerRow?.n ?? 0,
		fruitTreeCount: fruitTreeRow?.n ?? 0,
		fishCount: fishRow?.n ?? 0,
		bundleCount: bundleRow?.n ?? 0,
		forageableCount: forageableRow?.n ?? 0,
		mineralCount: mineralRow?.n ?? 0,
		craftedItemCount: craftedItemRow?.n ?? 0,
		monsterCount: monsterRow?.n ?? 0,
		weaponCount: weaponRow?.n ?? 0,
		cropsLastUpdated: cropRow?.last_updated ?? null,
		villagersLastUpdated: villagerRow?.last_updated ?? null,
		fruitTreesLastUpdated: fruitTreeRow?.last_updated ?? null,
		fishLastUpdated: fishRow?.last_updated ?? null,
		bundlesLastUpdated: bundleRow?.last_updated ?? null,
		forageablesLastUpdated: forageableRow?.last_updated ?? null,
		mineralsLastUpdated: mineralRow?.last_updated ?? null,
		craftedItemsLastUpdated: craftedItemRow?.last_updated ?? null,
		monstersLastUpdated: monsterRow?.last_updated ?? null,
		weaponsLastUpdated: weaponRow?.last_updated ?? null,
	};
}
