import styles from "./CommandHelp.module.scss";

const COMMANDS = [
	{
		syntax: "book <name>",
		example: "book price catalogue",
		desc: "Description, subsequent reading effect, location",
	},
	{
		syntax: "bundle <name>",
		example: "bundle spring",
		desc: "Room, required items, reward",
	},
	{
		syntax: "craft <name>",
		example: "craft furnace",
		desc: "Ingredients, duration, radius, energy, health, recipe source",
	},
	{
		syntax: "crop <name>",
		example: "crop parsnip",
		desc: "Seasons, growth time, seed price, sell price",
	},
	{
		syntax: "fish <name>",
		example: "fish tuna",
		desc: "Location, season, weather, difficulty, sell price",
	},
	{
		syntax: "forage <name>",
		example: "forage daffodil",
		desc: "Seasons, locations, energy, health, sell price",
	},
	{
		syntax: "fruit-tree <name>",
		example: "fruit-tree apple",
		desc: "Season, growth time, sapling price, sell price",
	},
	{
		syntax: "gift <villager> [tier]",
		example: "gift Emily loved",
		desc: "Gift preferences & birthday. Tier: loved, liked, neutral, disliked, hated",
	},
	{
		syntax: "ingredient <name>",
		example: "ingredient wood",
		desc: "All crafting recipes that use this item as an ingredient",
	},
	{
		syntax: "info",
		example: "info",
		desc: "Database record counts and last update time",
	},
	{
		syntax: "mineral <name>",
		example: "mineral quartz",
		desc: "Category, sources, uses, sell price",
	},
	{
		syntax: "monster <name>",
		example: "monster shadow brute",
		desc: "HP, damage, defense, speed, XP, location, drops",
	},
	{
		syntax: "schedule <villager> [day] [season]",
		example: "schedule Harvey Rain",
		desc: "Villager's schedule. Day filters by occasion (Rain, Monday, etc.). Season defaults to Default.",
	},
	{
		syntax: "season <season>",
		example: "season Summer",
		desc: "All crops for Spring, Summer, Fall, or Winter",
	},
	{
		syntax: "weapon <name>",
		example: "weapon infinity blade",
		desc: "Type, damage, speed, defense, crit stats, level",
	},
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
