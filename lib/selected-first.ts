/** Keep the existing order within each group without changing the input list. */
export function selectedFirst<T>(items: readonly T[], selected: (item: T) => boolean): T[] {
  return [...items.filter(selected), ...items.filter(item => !selected(item))];
}
