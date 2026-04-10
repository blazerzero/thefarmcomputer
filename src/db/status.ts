export function getStatus(sql: SqlStorage): {
	artifactCount: number;
	artisanGoodCount: number;
	cropCount: number;
	crystalariumCount: number;
	deconstructorItemCount: number;
	villagerCount: number;
	fruitCount: number;
	fruitTreeCount: number;
	fishCount: number;
	bundleCount: number;
	forageableCount: number;
	mineralCount: number;
	craftedItemCount: number;
	monsterCount: number;
	recipeCount: number;
	toolCount: number;
	weaponCount: number;
	footwearCount: number;
	bookCount: number;
	ringCount: number;
	artisanGoodsLastUpdated: string | null;
	cropsLastUpdated: string | null;
	crystalariumsLastUpdated: string | null;
	villagersLastUpdated: string | null;
	fruitsLastUpdated: string | null;
	fruitTreesLastUpdated: string | null;
	fishLastUpdated: string | null;
	bundlesLastUpdated: string | null;
	forageablesLastUpdated: string | null;
	mineralsLastUpdated: string | null;
	craftedItemsLastUpdated: string | null;
	monstersLastUpdated: string | null;
	recipesLastUpdated: string | null;
	toolsLastUpdated: string | null;
	weaponsLastUpdated: string | null;
	footwearLastUpdated: string | null;
	booksLastUpdated: string | null;
	ringsLastUpdated: string | null;
	artifactsLastUpdated: string | null;
	deconstructorItemsLastUpdated: string | null;
} {
	const artifactRow = sql
		.exec(
			"SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM artifacts",
		)
		.one() as { n: number; last_updated: string | null } | null;
	const artisanGoodRow = sql
		.exec(
			"SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM artisan_goods",
		)
		.one() as { n: number; last_updated: string | null } | null;
	const cropRow = sql
		.exec("SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM crops")
		.one() as { n: number; last_updated: string | null } | null;
	const villagerRow = sql
		.exec(
			"SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM villagers",
		)
		.one() as { n: number; last_updated: string | null } | null;
	const fruitRow = sql
		.exec("SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM fruits")
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
	const crystalariumRow = sql
		.exec(
			"SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM crystalariums",
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
	const recipeRow = sql
		.exec(
			"SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM recipes",
		)
		.one() as { n: number; last_updated: string | null } | null;
	const footwearRow = sql
		.exec(
			"SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM footwear",
		)
		.one() as { n: number; last_updated: string | null } | null;
	const bookRow = sql
		.exec("SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM books")
		.one() as { n: number; last_updated: string | null } | null;
	const ringRow = sql
		.exec("SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM rings")
		.one() as { n: number; last_updated: string | null } | null;
	const deconstructItemRow = sql
		.exec(
			"SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM deconstructor_items",
		)
		.one() as { n: number; last_updated: string | null } | null;
	const toolRow = sql
		.exec("SELECT COUNT(*) AS n, MAX(last_updated) AS last_updated FROM tools")
		.one() as { n: number; last_updated: string | null } | null;
	return {
		artifactCount: artifactRow?.n ?? 0,
		artisanGoodCount: artisanGoodRow?.n ?? 0,
		cropCount: cropRow?.n ?? 0,
		crystalariumCount: crystalariumRow?.n ?? 0,
		villagerCount: villagerRow?.n ?? 0,
		fruitCount: fruitRow?.n ?? 0,
		fruitTreeCount: fruitTreeRow?.n ?? 0,
		fishCount: fishRow?.n ?? 0,
		bundleCount: bundleRow?.n ?? 0,
		forageableCount: forageableRow?.n ?? 0,
		mineralCount: mineralRow?.n ?? 0,
		craftedItemCount: craftedItemRow?.n ?? 0,
		monsterCount: monsterRow?.n ?? 0,
		recipeCount: recipeRow?.n ?? 0,
		toolCount: toolRow?.n ?? 0,
		weaponCount: weaponRow?.n ?? 0,
		footwearCount: footwearRow?.n ?? 0,
		bookCount: bookRow?.n ?? 0,
		ringCount: ringRow?.n ?? 0,
		deconstructorItemCount: deconstructItemRow?.n ?? 0,
		artisanGoodsLastUpdated: artisanGoodRow?.last_updated ?? null,
		cropsLastUpdated: cropRow?.last_updated ?? null,
		crystalariumsLastUpdated: crystalariumRow?.last_updated ?? null,
		villagersLastUpdated: villagerRow?.last_updated ?? null,
		fruitsLastUpdated: fruitRow?.last_updated ?? null,
		fruitTreesLastUpdated: fruitTreeRow?.last_updated ?? null,
		fishLastUpdated: fishRow?.last_updated ?? null,
		bundlesLastUpdated: bundleRow?.last_updated ?? null,
		forageablesLastUpdated: forageableRow?.last_updated ?? null,
		mineralsLastUpdated: mineralRow?.last_updated ?? null,
		craftedItemsLastUpdated: craftedItemRow?.last_updated ?? null,
		monstersLastUpdated: monsterRow?.last_updated ?? null,
		recipesLastUpdated: recipeRow?.last_updated ?? null,
		toolsLastUpdated: toolRow?.last_updated ?? null,
		weaponsLastUpdated: weaponRow?.last_updated ?? null,
		footwearLastUpdated: footwearRow?.last_updated ?? null,
		booksLastUpdated: bookRow?.last_updated ?? null,
		ringsLastUpdated: ringRow?.last_updated ?? null,
		artifactsLastUpdated: artifactRow?.last_updated ?? null,
		deconstructorItemsLastUpdated: deconstructItemRow?.last_updated ?? null,
	};
}
