/** "1 location" / "2 locations" — counts read correctly at every value. */
export function plural(
  count: number,
  singular: string,
  pluralForm = `${singular}s`,
) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
