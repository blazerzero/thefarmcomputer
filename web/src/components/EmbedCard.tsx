import type { DiscordEmbed, EmbedField } from "../types";

interface Props {
  embed: DiscordEmbed;
}

function colorToHex(color: number | undefined): string {
  if (color == null) return "#1e1f22";
  return "#" + color.toString(16).padStart(6, "0");
}

function FieldValue({ value }: { value: string }) {
  if (!value) return null;
  // Render newline-separated lines
  return (
    <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {value}
    </span>
  );
}

interface FieldsGridProps {
  fields: EmbedField[];
}

function FieldsGrid({ fields }: FieldsGridProps) {
  // Group fields for rendering: consecutive inline fields go side-by-side (up to 3),
  // non-inline fields span the full row.
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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: "grid",
            gridTemplateColumns: row[0]?.inline ? `repeat(${row.length}, 1fr)` : "1fr",
            gap: "0.5rem",
          }}
        >
          {row.map((field, i) => (
            <div key={i}>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#dbdee1",
                  marginBottom: "0.125rem",
                }}
              >
                {field.name}
              </div>
              {field.value && (
                <div style={{ fontSize: "0.875rem", color: "#dbdee1" }}>
                  <FieldValue value={field.value} />
                </div>
              )}
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
      style={{
        display: "inline-flex",
        maxWidth: "31.25rem",
        width: "100%",
        background: "#2b2d31",
        borderRadius: "0.25rem",
        overflow: "hidden",
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      <div style={{ padding: "0.75rem 1rem", flex: 1, minWidth: 0 }}>
        {/* Header row: title + thumbnail */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {embed.title && (
              embed.url ? (
                <a
                  href={embed.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "block",
                    fontWeight: 600,
                    fontSize: "1rem",
                    color: "#00a8fc",
                    marginBottom: "0.25rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {embed.title}
                </a>
              ) : (
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "1rem",
                    color: "#dbdee1",
                    marginBottom: "0.25rem",
                  }}
                >
                  {embed.title}
                </div>
              )
            )}

            {embed.description && (
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#dbdee1",
                  marginBottom: "0.25rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {embed.description}
              </p>
            )}
          </div>

          {embed.thumbnail?.url && (
            <img
              src={embed.thumbnail.url}
              alt=""
              style={{
                width: "4rem",
                height: "4rem",
                objectFit: "contain",
                flexShrink: 0,
                borderRadius: "0.25rem",
                imageRendering: "pixelated",
              }}
            />
          )}
        </div>

        {embed.fields && embed.fields.length > 0 && (
          <FieldsGrid fields={embed.fields} />
        )}

        {embed.footer?.text && (
          <div
            style={{
              marginTop: "0.75rem",
              paddingTop: "0.5rem",
              borderTop: "1px solid #3f4147",
              fontSize: "0.75rem",
              color: "#949ba4",
              whiteSpace: "pre-wrap",
            }}
          >
            {embed.footer.text}
          </div>
        )}
      </div>
    </div>
  );
}
