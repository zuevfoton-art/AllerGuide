const LIST_SPLIT_PATTERN = /[,;\n]+/;
const LAST_ITEM_PATTERN = /^(.*?)[,;\n]([^,;\n]*)$/s;

/** Split a comma / semicolon / newline list and drop empty items. */
export function splitListInput(value: string): string[] {
  return value
    .split(LIST_SPLIT_PATTERN)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** The token currently being typed — the text after the last separator. */
export function lastListItemQuery(value: string): string {
  const parts = value.split(/[,;\n]/);
  return (parts[parts.length - 1] ?? '').trim();
}

/** Replace the incomplete last token with a chosen catalog name. */
export function replaceLastListItem(value: string, nextItem: string): string {
  const chosen = nextItem.trim();
  if (!chosen) return value.trim();

  const match = value.match(LAST_ITEM_PATTERN);
  if (!match) return chosen;

  const prefix = match[1].replace(/[,;\s]+$/g, '').trim();
  return prefix ? `${prefix}, ${chosen}` : chosen;
}
