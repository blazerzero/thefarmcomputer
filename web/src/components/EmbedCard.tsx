import type { DiscordEmbed, EmbedField } from "../types";
import styles from "./EmbedCard.module.scss";

interface Props {
	embed: DiscordEmbed;
}

function colorToHex(color: number | undefined): string {
	if (color == null) return "#1e1f22";
	return "#" + color.toString(16).padStart(6, "0");
}

function FieldValue({ value }: { value: string }) {
	if (!value) return null;
	return <span className={styles.fieldValue}>{value}</span>;
}

interface FieldsGridProps {
	fields: EmbedField[];
}

function colsClass(count: number, isInline: boolean): string {
	if (!isInline) return styles.cols1 ?? "";
	if (count === 2) return styles.cols2 ?? "";
	if (count === 3) return styles.cols3 ?? "";
	return styles.cols1 ?? "";
}

function FieldsGrid({ fields }: FieldsGridProps) {
	// Group fields: consecutive inline fields go side-by-side (max 3), non-inline span full row.
	const rows: EmbedField[][] = [];
	let currentRow: EmbedField[] = [];

	for (const field of fields) {
		if (!field.inline) {
			if (currentRow.length > 0) {
				rows.push(currentRow);
				currentRow = [];
			}
			rows.push([field]);
		} else {
			currentRow.push(field);
			if (currentRow.length === 3) {
				rows.push(currentRow);
				currentRow = [];
			}
		}
	}
	if (currentRow.length > 0) rows.push(currentRow);

	return (
		<div className={styles.fields}>
			{rows.map((row, rowIdx) => (
				<div
					key={rowIdx}
					className={`${styles.fieldsRow} ${colsClass(row.length, row[0]?.inline ?? false)}`}
				>
					{row.map((field, i) => (
						<div key={i}>
							<div className={styles.fieldName}>{field.name}</div>
							{field.value && <FieldValue value={field.value} />}
						</div>
					))}
				</div>
			))}
		</div>
	);
}

export function EmbedCard({ embed }: Props) {
	const accentColor = colorToHex(embed.color);

	return (
		<div
			className={styles.card}
			style={{ borderLeft: `4px solid ${accentColor}` }}
		>
			<div className={styles.body}>
				<div className={styles.header}>
					<div className={styles.headerContent}>
						{embed.title && (
							embed.url ? (
								<a
									href={embed.url}
									target="_blank"
									rel="noreferrer"
									className={`${styles.title} ${styles.link}`}
								>
									{embed.title}
								</a>
							) : (
								<div className={`${styles.title} ${styles.plain}`}>
									{embed.title}
								</div>
							)
						)}

						{embed.description && (
							<p className={styles.description}>{embed.description}</p>
						)}
					</div>

					{embed.thumbnail?.url && (
						<img
							src={embed.thumbnail.url}
							alt=""
							className={styles.thumbnail}
						/>
					)}
				</div>

				{embed.fields && embed.fields.length > 0 && (
					<FieldsGrid fields={embed.fields} />
				)}

				{embed.footer?.text && (
					<div className={styles.footer}>{embed.footer.text}</div>
				)}
			</div>
		</div>
	);
}
