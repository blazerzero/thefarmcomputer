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

Props interface (matches the existing `App.tsx` call site):

```ts
interface Props {
  onSubmit: (input: string) => void;
  loading: boolean;
}
```

The Search button is disabled and fields are locked while `loading` is true, matching the existing `CommandInput` behaviour.

## Architecture

### Config-driven field definitions

A `COMMAND_DEFS` array in `CommandForm.tsx` describes every command's parameters. Two field types:

```ts
type FieldDef =
  | { type: "text";   name: string; label: string; placeholder: string; required: boolean }
  | { type: "select"; name: string; label: string; options: { label: string; value: string }[]; required: boolean; default?: string }
```

```ts
interface CommandDef {
  name: string;
  fields: FieldDef[];
}
```

The `default` property on select fields sets both the initial displayed value and the initial state value. Fields without `default` initialize to `""`.

### Command → field mapping

| Command | Fields |
| --- | --- |
| bundle, craft, crop, fish, forage, fruit-tree, ingredient, mineral | `name` (text, required) |
| gift | `villager` (text, required) · `tier` (select: loved/liked/neutral/disliked/hated, optional) |
| schedule | `villager` (text, required) · `day` (text, optional) · `season` (select: Default/Spring/Summer/Fall/Winter/Marriage, optional, `default: "Default"`) |
| season | `season` (select: Spring/Summer/Fall/Winter, required, starts blank) |
| info | *(no fields)* |

For required selects that start blank (i.e. `season` command's `season` field), the `<select>` renders a first disabled option with value `""` and label `"— select —"`. This is what keeps the submit button disabled until the user makes a choice.

### State

```ts
const [command, setCommand] = useState<string>(COMMAND_DEFS[0].name);
const [values, setValues] = useState<Record<string, string>>({});
```

On mount and whenever `command` changes, `values` is reset by initializing each field to `field.default ?? ""`.

### Submit logic

1. Trim each text field value before use.
2. For each field in declaration order, determine the effective value: trimmed text value, or select value.
3. **Trailing empty optional fields are omitted.** Working from the last field backwards, drop any optional fields with an empty value until a non-empty field (or a required field) is reached.
4. **Empty optional fields in the middle are included as `""`** (a quoted empty string). This is required to avoid shifting later positional arguments into the wrong slot. For example, if `schedule` is submitted with `villager="Abigail"`, `day=""`, `season="Summer"`, omitting the empty `day` would produce `schedule Abigail Summer`, and `web.ts` would read `args[1]="Summer"` — which passes a truthy check and gets pushed as `day`, not `season`. Instead, emitting `schedule Abigail "" Summer` passes the empty string through `splitArgs` as `args[1]`, which fails the truthy check in `web.ts` and is therefore not pushed as `day`; `args[2]="Summer"` is then correctly pushed as `season`.
5. The `season` field on `schedule` has a `default` of `"Default"`. When the user leaves it at the default, `"Default"` is a non-empty value and is included in the output like any other. The backend produces the same result whether `"Default"` is sent explicitly or omitted entirely, so this is purely a consistency choice: always include non-empty values, regardless of whether they match a field's default.
6. Quote any value that contains a space: if the value contains a space, wrap it in double quotes before appending.
7. Join as: `command arg1 arg2 …` and call `onSubmit(input)`.
8. `info` always submits as just `"info"` (no args).

The Search button is disabled when any `required` field has an empty/blank value. `info` (no required fields) is always submittable.

## Responsive Layout

Three layouts activated by CSS breakpoints. The command selector, parameter fields, and Search button are the same elements in all three — only their arrangement changes.

| Breakpoint | Layout |
| --- | --- |
| `< 568px` | **C — Stacked:** command select, then each param field, then Search button — all full-width, one per row |
| `568px – 999px` | **A — Two-row:** command select on row 1; param fields + Search button on row 2, wrapping as needed |
| `≥ 1000px` | **B — Inline:** command select + all param fields + Search button in a single flex row |

## Files

| File | Action |
| --- | --- |
| `web/src/components/CommandForm.tsx` | Create |
| `web/src/components/CommandForm.module.scss` | Create |
| `web/src/App.tsx` | Update import: `CommandInput` → `CommandForm` |
| `web/src/components/CommandInput.tsx` | Delete |
| `web/src/components/CommandInput.module.scss` | Delete |
