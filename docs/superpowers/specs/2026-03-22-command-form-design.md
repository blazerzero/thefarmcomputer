# Command Form Design

**Date:** 2026-03-22
**Status:** Approved

## Overview

Replace the freetext `CommandInput` component with a structured `CommandForm` that presents a command selector and dynamically rendered parameter fields. The goal is to eliminate the need for users to know command syntax, while still surfacing which commands exist (via the existing `CommandHelp` section).

## Motivation

Some commands (notably `schedule`) have optional parameters that vary by villager — some villagers only have season-specific schedules, others only day-specific ones. A freetext field forces users to know the exact syntax and parameter order. A form removes that friction.

## Component: `CommandForm`

Replaces `CommandInput` entirely. `App.tsx` swaps the import. `CommandInput.tsx` and `CommandInput.module.scss` are deleted.

The `CommandHelp` section remains unchanged — it mirrors Discord usage and previews available commands.

## Architecture

### Config-driven field definitions

A `COMMAND_DEFS` array in `CommandForm.tsx` describes every command's parameters. Two field types:

```ts
type FieldDef =
  | { type: "text";   name: string; label: string; placeholder: string; required: boolean }
  | { type: "select"; name: string; label: string; options: { label: string; value: string }[]; required: boolean }
```

```ts
interface CommandDef {
  name: string;
  fields: FieldDef[];
}
```

### Command → field mapping

| Command | Fields |
|---|---|
| bundle, craft, crop, fish, forage, fruit-tree, ingredient, mineral | `name` (text, required) |
| gift | `villager` (text, required) · `tier` (select: loved/liked/neutral/disliked/hated, optional) |
| schedule | `villager` (text, required) · `day` (text, optional) · `season` (select: Default/Spring/Summer/Fall/Winter/Marriage, optional, default `"Default"`) |
| season | `season` (select: Spring/Summer/Fall/Winter, required, starts blank/empty) |
| info | *(no fields)* |

### State

```ts
const [command, setCommand] = useState<string>(COMMAND_DEFS[0].name);
const [values, setValues] = useState<Record<string, string>>({});
```

`values` resets to `{}` whenever `command` changes.

### Submit logic

1. Build arg list from `values`, in the order fields are declared.
2. Quote any value that contains a space: `value.includes(" ") ? `"${value}"` : value`.
3. Join as: `"command arg1 arg2 …"` and call `onSubmit(input)`.
4. `info` submits as just `"info"` with no args.

The Search button is disabled when any `required` field has an empty value, except `info` which is always submittable.

## Responsive Layout

Three layouts activated by CSS breakpoints. The command selector, parameter fields, and Search button are the same elements in all three — only their arrangement changes.

| Breakpoint | Layout |
|---|---|
| `< 568px` | **C — Stacked:** command select, then each param field, then Search button — all full-width, one per row |
| `568px – 999px` | **A — Two-row:** command select on row 1; param fields + Search button on row 2, wrapping as needed |
| `≥ 1000px` | **B — Inline:** command select + all param fields + Search button in a single flex row |

## Files

| File | Action |
|---|---|
| `web/src/components/CommandForm.tsx` | Create |
| `web/src/components/CommandForm.module.scss` | Create |
| `web/src/App.tsx` | Update import: `CommandInput` → `CommandForm` |
| `web/src/components/CommandInput.tsx` | Delete |
| `web/src/components/CommandInput.module.scss` | Delete |
