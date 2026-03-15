import { HTMLElement } from "node-html-parser";

export function parseCellWithItemList(cell: HTMLElement): string[] {
    const items = cell.querySelectorAll(":scope > span, :scope > p");
    if (items.length > 0) {
        return items
            .map(item => item.text.replace(/\s+/g, " ").trim())
            .filter(t => t.length > 0);
    }
    return [];
}
