/** Preserve criterion identity and internal newlines across the scope editor. */
export function toScopeCriteria<T extends { id: string; text: string }>(
  entries: readonly T[],
): T[] {
  return entries
    .filter((item) => item.text.trim())
    .map((item) => ({ ...item, text: item.text.trim() }));
}
