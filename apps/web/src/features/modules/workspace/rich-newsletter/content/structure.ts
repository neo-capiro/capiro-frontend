import {
  cloneNewsletterBlocks,
  createNewsletterBlock,
  createNewsletterSection,
  findNewsletterBlock,
  type NewsletterBlock,
  type NewsletterBlockKind,
  type NewsletterDesign,
  type NewsletterSection,
} from "@capiro/shared/newsletter";

export type BlockContainer = {
  sectionId: string;
  blockId?: string;
  column?: number;
  beforeId?: string;
};
export type StructureAction =
  | { type: "addSection" }
  | { type: "insertSection"; section: NewsletterSection }
  | { type: "insertBlock"; block: NewsletterBlock; target: BlockContainer }
  | {
      type: "section";
      id: string;
      action: "duplicate" | "delete" | "up" | "down";
    }
  | {
      type: "addBlock";
      target: BlockContainer;
      kind: NewsletterBlockKind;
      ratio?: NewsletterBlock["ratio"];
    }
  | { type: "block"; id: string; action: "duplicate" | "up" | "down" }
  | { type: "moveBlock"; id: string; target: BlockContainer }
  | { type: "columns"; id: string; count: number };

/** The OS ratio labels map to the number of rendered columns. */
export function columnCount(ratio: NewsletterBlock["ratio"]) {
  return ratio.includes(":") ? 2 : Number(ratio);
}

function locate(design: NewsletterDesign, id: string) {
  const search = (
    blocks: NewsletterBlock[],
    section: NewsletterSection,
  ):
    | { blocks: NewsletterBlock[]; index: number; section: NewsletterSection }
    | undefined => {
    const index = blocks.findIndex((block) => block.id === id);
    if (index >= 0) return { blocks, index, section };
    for (const block of blocks)
      for (const column of block.columns) {
        const found = search(column, section);
        if (found) return found;
      }
  };
  for (const section of design.sections) {
    const found = search(section.blocks, section);
    if (found) return found;
  }
}
function container(design: NewsletterDesign, target: BlockContainer) {
  const section = design.sections.find((item) => item.id === target.sectionId);
  if (!section) throw new Error("This section is no longer available.");
  if (!target.blockId) return { blocks: section.blocks, section };
  const owner = locate(design, target.blockId);
  const block = owner?.blocks[owner.index];
  const blocks = block?.columns[target.column ?? -1];
  if (owner?.section !== section || block?.kind !== "columns" || !blocks)
    throw new Error("This column is no longer available.");
  return { blocks, section };
}
function reorder<T>(items: T[], index: number, direction: "up" | "down") {
  const target = index + (direction === "up" ? -1 : 1);
  if (target >= 0 && target < items.length)
    [items[index], items[target]] = [items[target]!, items[index]!];
}
function insertBlock(
  blocks: NewsletterBlock[],
  block: NewsletterBlock,
  target: BlockContainer,
) {
  const index =
    target.beforeId === undefined
      ? blocks.length
      : blocks.findIndex((item) => item.id === target.beforeId);
  if (index < 0)
    throw new Error("The insertion position is no longer available.");
  blocks.splice(index, 0, block);
}
function checkStructure(design: NewsletterDesign) {
  let count = 0;
  const walk = (blocks: NewsletterBlock[], depth: number, limit: number) => {
    if (blocks.length > limit)
      throw new Error(`This container supports up to ${limit} blocks.`);
    for (const block of blocks) {
      if (++count > 500 || depth > 6)
        throw new Error(
          "A newsletter supports up to 500 blocks and six nested column levels.",
        );
      block.columns.forEach((column) => walk(column, depth + 1, 100));
    }
  };
  if (design.sections.length > 50)
    throw new Error("A newsletter supports up to 50 sections.");
  design.sections.forEach((section) => walk(section.blocks, 0, 200));
}
function inheritSources(target: NewsletterSection, source: NewsletterSection) {
  if (source.sourceClientIds?.length) {
    const ids = [
      ...new Set([
        ...(target.sourceClientIds ?? []),
        ...source.sourceClientIds,
      ]),
    ];
    if (ids.length > 100)
      throw new Error("The destination would exceed its source-client limit.");
    target.sourceClientIds = ids;
  }
  if (source.fonts?.length) {
    const fonts = [...(target.fonts ?? [])];
    for (const font of source.fonts) {
      const same = fonts.find((entry) => entry.assetId === font.assetId);
      if (same && JSON.stringify(same) !== JSON.stringify(font))
        throw new Error(
          "The sections use different versions of the same font. Keep this block in its section.",
        );
      if (!same) fonts.push(structuredClone(font));
    }
    if (fonts.length > 100)
      throw new Error("The destination would exceed its font limit.");
    target.fonts = fonts;
  }
}

/** One local operation; the existing editor records its whole result for Undo. */
export function changeStructure(
  design: NewsletterDesign,
  action: StructureAction,
) {
  const next = structuredClone(design);
  let selectedId: string | undefined;
  if (action.type === "addSection") {
    next.sections.push(createNewsletterSection("Untitled section"));
  } else if (action.type === "insertSection") {
    const section = {
      ...structuredClone(action.section),
      id: createNewsletterSection("").id,
      blocks: cloneNewsletterBlocks(action.section.blocks),
    };
    next.sections.push(section);
    selectedId = section.blocks[0]?.id;
  } else if (action.type === "insertBlock") {
    const block = cloneNewsletterBlocks([action.block])[0]!;
    insertBlock(container(next, action.target).blocks, block, action.target);
    selectedId = block.id;
  } else if (action.type === "section") {
    const index = next.sections.findIndex(
      (section) => section.id === action.id,
    );
    if (index < 0) throw new Error("This section is no longer available.");
    if (action.action === "delete") next.sections.splice(index, 1);
    else if (action.action === "duplicate") {
      const source = next.sections[index]!;
      next.sections.splice(index + 1, 0, {
        ...structuredClone(source),
        id: createNewsletterSection("").id,
        name: `${source.name.slice(0, 95)} copy`,
        blocks: cloneNewsletterBlocks(source.blocks),
      });
    } else reorder(next.sections, index, action.action);
  } else if (action.type === "addBlock") {
    const block = createNewsletterBlock(
      action.kind,
      action.kind === "columns" && action.ratio
        ? {
            ratio: action.ratio,
            columns: Array.from(
              { length: columnCount(action.ratio) },
              () => [],
            ),
          }
        : {},
    );
    // This slice offers manual thumbnails, never an unfulfilled auto-fetch state.
    if (block.kind === "video")
      block.video = { ...block.video, thumbnail: "custom", sourceUrl: "" };
    insertBlock(container(next, action.target).blocks, block, action.target);
    selectedId = block.id;
  } else if (action.type === "columns") {
    const block = findNewsletterBlock(next, action.id);
    if (
      block?.kind !== "columns" ||
      !Number.isInteger(action.count) ||
      action.count < 1 ||
      action.count > 4
    )
      throw new Error("Choose one to four columns.");
    if (block.columns.slice(action.count).some((column) => column.length))
      throw new Error(
        "Move or remove content from the last columns before reducing their number.",
      );
    block.columns = Array.from(
      { length: action.count },
      (_, index) => block.columns[index] ?? [],
    );
    block.ratio = String(action.count) as NewsletterBlock["ratio"];
  } else {
    const source = locate(next, action.id);
    if (!source) throw new Error("This block is no longer available.");
    const block = source.blocks[source.index]!;
    if (action.type === "moveBlock") {
      const destination = container(next, action.target);
      const contains = (items: NewsletterBlock[]): boolean =>
        items === destination.blocks ||
        items.some((item) => item.columns.some(contains));
      if (block.columns.some(contains))
        throw new Error("A block cannot be moved inside itself.");
      if (destination.section !== source.section)
        inheritSources(destination.section, source.section);
      source.blocks.splice(source.index, 1);
      insertBlock(destination.blocks, block, action.target);
    } else if (action.action === "duplicate") {
      const copy = cloneNewsletterBlocks([block])[0]!;
      source.blocks.splice(source.index + 1, 0, copy);
      selectedId = copy.id;
    } else reorder(source.blocks, source.index, action.action);
  }
  checkStructure(next);
  return { design: next, selectedId };
}

export function blockDestinations(design: NewsletterDesign) {
  const result: { label: string; target: BlockContainer }[] = [];
  const walk = (
    blocks: NewsletterBlock[],
    sectionId: string,
    label: string,
  ) => {
    blocks.forEach((block, index) =>
      block.columns.forEach((column, columnIndex) => {
        const name = `${label} / block ${index + 1}, column ${columnIndex + 1}`;
        result.push({
          label: name,
          target: { sectionId, blockId: block.id, column: columnIndex },
        });
        walk(column, sectionId, name);
      }),
    );
  };
  design.sections.forEach((section) => {
    result.push({ label: section.name, target: { sectionId: section.id } });
    walk(section.blocks, section.id, section.name);
  });
  return result;
}

export function blockNeighbours(design: NewsletterDesign, id: string) {
  const found = locate(design, id);
  return {
    up: Boolean(found && found.index > 0),
    down: Boolean(found && found.index < found.blocks.length - 1),
  };
}
