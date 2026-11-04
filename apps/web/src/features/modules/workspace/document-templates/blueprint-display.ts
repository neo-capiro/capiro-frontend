import type {
  WorkspaceBlueprintListItem,
  WorkspaceBlueprintMetadata,
} from "@capiro/shared/workspace-template-studio";

const readable = (value: string) =>
  value
    .replaceAll(/[_-]+/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
export function blueprintDisplayName(
  row: Pick<WorkspaceBlueprintMetadata, "name" | "slug" | "product">,
) {
  const name = row.name.trim();
  if (name && !/^untitled(?: blueprint| template)?$/i.test(name)) return name;
  const slug = row.slug.trim();
  if (slug && !/^(untitled|[0-9a-f]{8}-)/i.test(slug)) return readable(slug);
  return `Unnamed ${readable(row.product || "document")} template`;
}
export function blueprintChoiceLabel(
  row: WorkspaceBlueprintListItem,
  ordinal: number,
) {
  const latest = row.versions[0];
  const name = blueprintDisplayName(row);
  return `${name}${name.startsWith("Unnamed ") ? ` ${ordinal + 1}` : ""} · ${readable(row.product || "Document")} · ${row.scope === "firm" ? "Firm" : "Capiro"}${latest ? ` · v${latest.version} ${latest.status}` : " · No published version"}`;
}
