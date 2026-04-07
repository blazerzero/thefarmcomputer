import type { SubmitEvent } from "react";
import { useState } from "react";
import styles from "./CommandForm.module.scss";

type FieldDef =
	| {
			type: "text";
			name: string;
			label: string;
			placeholder: string;
			required: boolean;
	  }
	| {
			type: "select";
			name: string;
			label: string;
			options: { label: string; value: string }[];
			required: boolean;
			default?: string;
	  };

interface CommandDef {
	name: string;
	fields: FieldDef[];
}

const SEASON_OPTIONS = [
	{ label: "Spring", value: "Spring" },
	{ label: "Summer", value: "Summer" },
	{ label: "Fall", value: "Fall" },
	{ label: "Winter", value: "Winter" },
];

const COMMAND_DEFS: CommandDef[] = [
	{
		name: "artifact",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Dwarvish Helm",
				required: true,
			},
		],
	},
	{
		name: "artisan",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Wine",
				required: true,
			},
		],
	},
	{
		name: "book",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Price Catalogue",
				required: true,
			},
		],
	},
	{
		name: "bundle",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Spring",
				required: true,
			},
		],
	},
	{
		name: "craft",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Furnace",
				required: true,
			},
		],
	},
	{
		name: "crop",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Parsnip",
				required: true,
			},
		],
	},
	{
		name: "deconstruct",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Sprinkler",
				required: true,
			},
		],
	},
	{
		name: "fish",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Tuna",
				required: true,
			},
		],
	},
	{
		name: "footwear",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Sneakers",
				required: true,
			},
		],
	},
	{
		name: "forage",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Daffodil",
				required: true,
			},
		],
	},
	{
		name: "fruit",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Apple",
				required: true,
			},
		],
	},
	{
		name: "fruit-tree",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Apple",
				required: true,
			},
		],
	},
	{
		name: "gift",
		fields: [
			{
				type: "text",
				name: "villager",
				label: "Villager",
				placeholder: "e.g. Emily",
				required: true,
			},
			{
				type: "select",
				name: "tier",
				label: "Tier",
				required: false,
				options: [
					{ label: "Loved", value: "loved" },
					{ label: "Liked", value: "liked" },
					{ label: "Neutral", value: "neutral" },
					{ label: "Disliked", value: "disliked" },
					{ label: "Hated", value: "hated" },
				],
			},
		],
	},
	{
		name: "ingredient",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Wood",
				required: true,
			},
		],
	},
	{ name: "info", fields: [] },
	{
		name: "mineral",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Quartz",
				required: true,
			},
		],
	},
	{
		name: "monster",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Shadow Brute",
				required: true,
			},
		],
	},
	{
		name: "recipe",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Fried Egg",
				required: true,
			},
		],
	},
	{
		name: "ring",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Lucky Ring",
				required: true,
			},
		],
	},
	{
		name: "schedule",
		fields: [
			{
				type: "text",
				name: "villager",
				label: "Villager",
				placeholder: "e.g. Harvey",
				required: true,
			},
			{
				type: "text",
				name: "day",
				label: "Day",
				placeholder: "e.g. Desert Festival",
				required: false,
			},
			{
				type: "select",
				name: "season",
				label: "Season",
				required: false,
				default: "Default",
				options: [
					{ label: "Default", value: "Default" },
					...SEASON_OPTIONS,
					{ label: "Marriage", value: "Marriage" },
				],
			},
		],
	},
	{
		name: "season",
		fields: [
			{
				type: "select",
				name: "season",
				label: "Season",
				required: true,
				options: SEASON_OPTIONS,
			},
		],
	},
	{
		name: "tool",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Copper Hoe",
				required: true,
			},
		],
	},
	{
		name: "weapon",
		fields: [
			{
				type: "text",
				name: "name",
				label: "Name",
				placeholder: "e.g. Infinity Blade",
				required: true,
			},
		],
	},
];

function initValues(def: CommandDef): Record<string, string> {
	const values: Record<string, string> = {};
	for (const field of def.fields) {
		values[field.name] = field.type === "select" ? (field.default ?? "") : "";
	}
	return values;
}

function buildInput(
	commandName: string,
	def: CommandDef,
	values: Record<string, string>,
): string {
	if (def.fields.length === 0) return commandName;

	const effective = def.fields.map((field) =>
		field.type === "text"
			? (values[field.name] ?? "").trim()
			: (values[field.name] ?? ""),
	);

	// Find the last non-empty value to know how far to include args
	let lastNonEmpty = -1;
	for (let i = effective.length - 1; i >= 0; i--) {
		if (effective[i] !== "") {
			lastNonEmpty = i;
			break;
		}
	}

	if (lastNonEmpty === -1) return commandName;

	const args: string[] = [];
	for (let i = 0; i <= lastNonEmpty; i++) {
		const val = effective[i];
		if (val === "") {
			// Middle empty optional field — include as quoted empty string to preserve
			// positional alignment for the args that follow (web.ts uses truthy checks)
			args.push('""');
		} else if (val !== undefined) {
			args.push(val.includes(" ") ? `"${val}"` : val);
		}
	}

	return `${commandName} ${args.join(" ")}`;
}

interface Props {
	onSubmit: (input: string) => void;
	loading: boolean;
}

export function CommandForm({ onSubmit, loading }: Props) {
	const [commandName, setCommandName] = useState(COMMAND_DEFS[0]!.name);
	const [values, setValues] = useState<Record<string, string>>(() =>
		initValues(COMMAND_DEFS[0]!),
	);

	const currentDef = COMMAND_DEFS.find((d) => d.name === commandName)!;

	function handleCommandChange(name: string) {
		const def = COMMAND_DEFS.find((d) => d.name === name)!;
		setCommandName(name);
		setValues(initValues(def));
	}

	function handleFieldChange(fieldName: string, value: string) {
		setValues((prev) => ({ ...prev, [fieldName]: value }));
	}

	function isSubmittable(): boolean {
		return currentDef.fields.every((field) => {
			if (!field.required) return true;
			const val =
				field.type === "text"
					? (values[field.name] ?? "").trim()
					: (values[field.name] ?? "");
			return val !== "";
		});
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!isSubmittable() || loading) return;
		onSubmit(buildInput(commandName, currentDef, values));
	}

	const canSubmit = isSubmittable() && !loading;

	return (
		<form onSubmit={handleSubmit} className={styles.form}>
			<div className={styles.commandField}>
				<label className={styles.label} htmlFor="command-select">
					Command
				</label>
				<select
					id="command-select"
					className={styles.select}
					value={commandName}
					onChange={(e) => handleCommandChange(e.target.value)}
					disabled={loading}
				>
					{COMMAND_DEFS.map((def) => (
						<option key={def.name} value={def.name}>
							{def.name}
						</option>
					))}
				</select>
			</div>

			<div className={styles.params}>
				{currentDef.fields.map((field) => (
					<div key={field.name} className={styles.field}>
						<label className={styles.label} htmlFor={`field-${field.name}`}>
							{field.label}
							{!field.required && (
								<span className={styles.optionalHint}>optional</span>
							)}
						</label>
						{field.type === "text" ? (
							<input
								id={`field-${field.name}`}
								className={styles.input}
								type="text"
								value={values[field.name] ?? ""}
								onChange={(e) => handleFieldChange(field.name, e.target.value)}
								placeholder={field.placeholder}
								disabled={loading}
							/>
						) : (
							<select
								id={`field-${field.name}`}
								className={styles.select}
								value={values[field.name] ?? ""}
								onChange={(e) => handleFieldChange(field.name, e.target.value)}
								disabled={loading}
							>
								{field.required && !field.default && (
									<option value="" disabled>
										Select {field.name}...
									</option>
								)}
								{!field.required && !field.default && (
									<option value="">— any —</option>
								)}
								{field.options.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						)}
					</div>
				))}

				<button type="submit" className={styles.button} disabled={!canSubmit}>
					{loading ? "…" : "Search"}
				</button>
			</div>
		</form>
	);
}
