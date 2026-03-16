import { useState } from "react";
import { CommandHelp } from "./components/CommandHelp";
import { CommandInput } from "./components/CommandInput";
import { EmbedCard } from "./components/EmbedCard";
import type { QueryResult } from "./types";

/** Strip Discord markdown bold/italic markers for plain text display. */
function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/__/g, "").replace(/_/g, "");
}

export default function App() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(input: string) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/query?input=${encodeURIComponent(input)}`);
      const data = (await res.json()) as QueryResult;
      setResult(data);
    } catch {
      setResult({ error: "Failed to reach the server. Make sure wrangler dev is running." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem 1rem",
        gap: "1.5rem",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#dbdee1",
            marginBottom: "0.25rem",
          }}
        >
          The Farm Computer
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#949ba4" }}>
          Stardew Valley reference — type a command below
        </p>
      </div>

      {/* Input */}
      <CommandInput onSubmit={handleSubmit} loading={loading} />

      {/* Result */}
      {loading && (
        <p style={{ fontSize: "0.875rem", color: "#949ba4" }}>Loading…</p>
      )}

      {result && !loading && (
        result.error ? (
          <div
            style={{
              maxWidth: "31.25rem",
              width: "100%",
              padding: "0.75rem 1rem",
              background: "#2b2d31",
              borderLeft: "4px solid #ed4245",
              borderRadius: "0.25rem",
              fontSize: "0.875rem",
              color: "#dbdee1",
            }}
          >
            {stripMarkdown(result.error)}
          </div>
        ) : result.embed ? (
          <EmbedCard embed={result.embed} />
        ) : null
      )}

      {/* Help */}
      <CommandHelp />
    </div>
  );
}
