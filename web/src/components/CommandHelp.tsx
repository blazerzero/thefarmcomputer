import { useCallback, useEffect, useRef, useState } from "react";
import { IoChevronDown } from "react-icons/io5";
import { COMMAND_DESCRIPTIONS } from "@/api/constants";
import { Command } from "@/api/types";
import styles from "./CommandHelp.module.scss";

interface CommandItem {
	command: Command;
	syntax: string;
	example: string;
}

const COMMANDS: CommandItem[] = [
	{
		command: Command.ARTIFACT,
		syntax: "artifact <name>",
		example: "artifact dwarvish helm",
	},
	{
		command: Command.ARTISAN,
		syntax: "artisan <name>",
		example: "artisan wine",
	},
	{
		command: Command.BOOK,
		syntax: "book <name>",
		example: "book price catalogue",
	},
	{
		command: Command.BUNDLE,
		syntax: "bundle <name>",
		example: "bundle spring",
	},
	{ command: Command.CRAFT, syntax: "craft <name>", example: "craft furnace" },
	{ command: Command.CROP, syntax: "crop <name>", example: "crop parsnip" },
	{
		command: Command.DECONSTRUCT,
		syntax: "deconstruct <name>",
		example: "deconstruct sprinkler",
	},
	{ command: Command.FISH, syntax: "fish <name>", example: "fish tuna" },
	{
		command: Command.FOOTWEAR,
		syntax: "footwear <name>",
		example: "footwear sneakers",
	},
	{
		command: Command.FORAGE,
		syntax: "forage <name>",
		example: "forage daffodil",
	},
	{
		command: Command.FRUIT,
		syntax: "fruit <name>",
		example: "fruit apple",
	},
	{
		command: Command.FRUIT_TREE,
		syntax: "fruit-tree <name>",
		example: "fruit-tree apple",
	},
	{
		command: Command.GIFT,
		syntax: "gift <villager> [tier]",
		example: "gift Emily loved",
	},
	{
		command: Command.INGREDIENT,
		syntax: "ingredient <name>",
		example: "ingredient wood",
	},
	{ command: Command.INFO, syntax: "info", example: "info" },
	{
		command: Command.MINERAL,
		syntax: "mineral <name>",
		example: "mineral quartz",
	},
	{
		command: Command.MONSTER,
		syntax: "monster <name>",
		example: "monster shadow brute",
	},
	{
		command: Command.RECIPE,
		syntax: "recipe <name>",
		example: "recipe fried egg",
	},
	{ command: Command.RING, syntax: "ring <name>", example: "ring lucky ring" },
	{
		command: Command.SCHEDULE,
		syntax: "schedule <villager> [day] [season]",
		example: "schedule Harvey Rain",
	},
	{
		command: Command.SEASON,
		syntax: "season <season>",
		example: "season Summer",
	},
	{ command: Command.TOOL, syntax: "tool <name>", example: "tool copper hoe" },
	{
		command: Command.WEAPON,
		syntax: "weapon <name>",
		example: "weapon infinity blade",
	},
];

export function CommandHelp() {
	const listRef = useRef<HTMLDivElement>(null);
	const [showMore, setShowMore] = useState(false);

	const checkScroll = useCallback(() => {
		const el = listRef.current;
		if (!el) return;
		setShowMore(el.scrollHeight - el.scrollTop > el.clientHeight + 1);
	}, []);

	useEffect(() => {
		const el = listRef.current;
		if (!el) return;
		checkScroll();
		const observer = new ResizeObserver(checkScroll);
		observer.observe(el);
		return () => observer.disconnect();
	}, [checkScroll]);

	return (
		<div className={styles.container}>
			<div className={styles.heading}>Available Commands</div>
			<div className={styles.listWrapper}>
				<div ref={listRef} className={styles.list} onScroll={checkScroll}>
					{COMMANDS.map((cmd) => (
						<div key={cmd.syntax} className={styles.item}>
							<div className={styles.itemHeader}>
								<code className={styles.code}>{cmd.syntax}</code>
								<span className={styles.example}>e.g. {cmd.example}</span>
							</div>
							<div className={styles.desc}>
								{COMMAND_DESCRIPTIONS[cmd.command]}
							</div>
						</div>
					))}
				</div>
				{showMore && (
					<div className={styles.seeMore} aria-hidden="true">
						See more
						<IoChevronDown size="1rem" />
					</div>
				)}
			</div>
		</div>
	);
}
