import { DEFAULT_COLOR, formatDate } from "../constants";
import { getBook } from "../db";
import { embedResponse, getOption, notFoundResponse, renderDotList } from "./utils";

export function handleBook(
  interaction: Record<string, unknown>,
  sql: SqlStorage,
): Response {
  const name = getOption(interaction, "name");
  const book = getBook(sql, name);

  if (!book) {
    return notFoundResponse(`No book named **${name}** found. Check the spelling (e.g. \`Price Catalogue\`, \`Animal Catalogue\`).`);
  }

  const fields: Array<{ name: string; value: string; inline: boolean }> = [];

  if (book.subsequent_reading !== null) {
    fields.push({ name: "Subsequent Reading", value: book.subsequent_reading, inline: false });
  }

  if (book.location.length > 0) {
    fields.push({ name: "Location", value: renderDotList(book.location), inline: false });
  }

  return embedResponse({
    title: book.name,
    url: book.wiki_url,
    color: DEFAULT_COLOR,
    description: book.description ?? undefined,
    thumbnail: book.image_url ? { url: book.image_url } : undefined,
    fields,
    footer: { text: `Data from Stardew Valley Wiki • Last updated ${formatDate(book.last_updated)}` },
  });
}
