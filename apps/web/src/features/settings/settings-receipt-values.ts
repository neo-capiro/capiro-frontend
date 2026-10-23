export type Row = Record<string, unknown>;
export const row = (value: unknown): Row =>
  value && typeof value === "object" ? (value as Row) : {};
export const list = (value: unknown): Row[] =>
  Array.isArray(value) ? value.map(row) : [];
export const equal = (a: unknown, b: unknown) => a !== undefined && a === b;
export const sameMembers = (a: unknown, b: unknown) => {
  const left = Array.isArray(a) ? [...a].sort() : [];
  const right = Array.isArray(b) ? [...b].sort() : [];
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  );
};
