import styles from "./CommandHelp.module.scss";

const COMMANDS = [
	{ syntax: "crop <name>", example: "crop parsnip", desc: "Seasons, growth time, seed price, sell price" },
	{ syntax: "fish <name>", example: "fish tuna", desc: "Location, season, weather, difficulty, sell price" },
	{ syntax: "fruit-tree <name>", example: "fruit-tree apple", desc: "Season, growth time, sapling price, sell price" },
	{ syntax: "forage <name>", example: "forage daffodil", desc: "Seasons, locations, energy, health, sell price" },
	{ syntax: "bundle <name>", example: "bundle spring", desc: "Room, required items, reward" },
	{ syntax: "mineral <name>", example: "mineral quartz", desc: "Category, sources, uses, sell price" },
	{ syntax: "gift <villager> [tier]", example: "gift Emily loved", desc: "Gift preferences & birthday. Tier: loved, liked, neutral, disliked, hated" },
	{ syntax: "season <season>", example: "season Summer", desc: "All crops for Spring, Summer, Fall, or Winter" },
	{ syntax: "info", example: "info", desc: "Database record counts and last update time" },
];

export function CommandHelp() {
	return (
		<div className={styles.container}>
			<div className={styles.heading}>Available Commands</div>
			<div className={styles.list}>
				{COMMANDS.map((cmd) => (
					<div key={cmd.syntax} className={styles.item}>
						<div className={styles.itemHeader}>
							<code className={styles.code}>{cmd.syntax}</code>
							<span className={styles.example}>e.g. {cmd.example}</span>
						</div>
						<div className={styles.desc}>{cmd.desc}</div>
					</div>
				))}
			</div>
		</div>
	);
}
