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
    <div
      style={{
        width: "100%",
        maxWidth: "31.25rem",
        background: "#2b2d31",
        borderRadius: "0.25rem",
        padding: "0.75rem 1rem",
      }}
    >
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          color: "#949ba4",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "0.5rem",
        }}
      >
        Available Commands
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {COMMANDS.map((cmd) => (
          <div key={cmd.syntax} style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
              <code
                style={{
                  fontSize: "0.8125rem",
                  color: "#dbdee1",
                  background: "#1e1f22",
                  padding: "0.125rem 0.375rem",
                  borderRadius: "0.1875rem",
                  fontFamily: "Consolas, 'Courier New', monospace",
                  whiteSpace: "nowrap",
                }}
              >
                {cmd.syntax}
              </code>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#949ba4",
                  fontStyle: "italic",
                }}
              >
                e.g. {cmd.example}
              </span>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#949ba4", paddingLeft: "0.25rem" }}>
              {cmd.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
