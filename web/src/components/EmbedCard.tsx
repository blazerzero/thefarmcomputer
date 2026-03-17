import type { DiscordEmbed, EmbedField } from "../types";
import styles from "./EmbedCard.module.scss";
import { Markdown } from "./Markdown";

interface Props {
	embed: DiscordEmbed;
}

function colorToHex(color: number | undefined): string {
	if (color == null) return "#1e1f22";
	return "#" + color.toString(16).padStart(6, "0");
}

function FieldValue({ value }: { value: string }) {
	if (!value) return null;
	return (
		<div className={styles.fieldValue}>
			<Markdown>{value}</Markdown>
		</div>
	);
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
	const maxColCount = Math.max(...rows.map(r => r.length));

	return (
		<div className={styles.fields}>
			{rows.map((row, rowIdx) => (
				<div
					key={rowIdx}
					className={`${styles.fieldsRow} ${colsClass(maxColCount, row[0]?.inline ?? false)}`}
				>
					{row.map((field, i) => (
						<div key={i}>
							{field.name && <div className={styles.fieldName}>{field.name}</div>}
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

	const hasHeaderContent = Boolean(embed.title || embed.description || embed.thumbnail?.url);
	const hasTitleOrDescription = Boolean(embed.title || embed.description);

	return (
		<div
			className={styles.card}
			style={{ borderLeft: `4px solid ${accentColor}` }}
		>
			<div className={styles.body}>
				{hasHeaderContent && (
					<div className={styles.header}>
						{hasTitleOrDescription && (
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
									<Markdown>{embed.description}</Markdown>
								)}
							</div>
						)}

						{embed.thumbnail?.url && (
							<img
								src={embed.thumbnail.url}
								alt=""
								className={styles.thumbnail}
							/>
						)}
					</div>
				)}

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
