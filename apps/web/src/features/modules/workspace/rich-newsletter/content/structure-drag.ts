import {
  NEWSLETTER_BLOCK_KINDS,
  NEWSLETTER_COLUMN_RATIOS,
  type NewsletterBlock,
  type NewsletterBlockKind,
} from "@capiro/shared/newsletter";
import type { BlockContainer, StructureAction } from "./structure";

export const NEWSLETTER_DRAG_TYPE = "application/x-capiro-newsletter-block";
type DragData =
  | { type: "move"; id: string }
  | {
      type: "add";
      kind: NewsletterBlockKind;
      ratio?: NewsletterBlock["ratio"];
    };

export function startBlockDrag(transfer: DataTransfer, data: DragData) {
  transfer.setData(NEWSLETTER_DRAG_TYPE, JSON.stringify(data));
  transfer.effectAllowed = data.type === "move" ? "move" : "copy";
}

/** A drop expresses a local structure edit; the existing reducer validates it. */
export function readBlockDrop(
  transfer: Pick<DataTransfer, "getData">,
  target: BlockContainer,
): StructureAction | null {
  try {
    const raw = transfer.getData(NEWSLETTER_DRAG_TYPE);
    if (raw.length > 1000) return null;
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    if (
      value.type === "move" &&
      typeof value.id === "string" &&
      value.id.length <= 200
    )
      return { type: "moveBlock", id: value.id, target };
    if (
      value.type !== "add" ||
      !NEWSLETTER_BLOCK_KINDS.includes(value.kind) ||
      value.kind === "survey"
    )
      return null;
    if (
      value.kind === "columns" &&
      !NEWSLETTER_COLUMN_RATIOS.includes(value.ratio)
    )
      return null;
    return {
      type: "addBlock",
      kind: value.kind,
      target,
      ...(value.kind === "columns" ? { ratio: value.ratio } : {}),
    };
  } catch {
    return null;
  }
}
