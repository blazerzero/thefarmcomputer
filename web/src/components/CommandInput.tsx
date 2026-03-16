import { type FormEvent, useState } from "react";

interface Props {
  onSubmit: (input: string) => void;
  loading: boolean;
}

export function CommandInput({ onSubmit, loading }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        gap: "0.5rem",
        width: "100%",
        maxWidth: "31.25rem",
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="crop parsnip"
        disabled={loading}
        autoFocus
        style={{
          flex: 1,
          padding: "0.5rem 0.75rem",
          fontSize: "1rem",
          background: "#1e1f22",
          color: "#dbdee1",
          border: "1px solid #3f4147",
          borderRadius: "0.25rem",
          outline: "none",
          fontFamily: "inherit",
        }}
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        style={{
          padding: "0.5rem 1rem",
          fontSize: "1rem",
          fontWeight: 600,
          background: "#5b8a3c",
          color: "#fff",
          border: "none",
          borderRadius: "0.25rem",
          opacity: loading || !value.trim() ? 0.5 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {loading ? "…" : "Search"}
      </button>
    </form>
  );
}
