import {
  briefCopyBodySchema,
  type BriefCopyBody,
} from "@/shared/capiro/operations/workspace-brief-copy";

/** Replace one authored field; rich JSON outside that field is never projected away. */
export function replaceCopySection(
  body: BriefCopyBody,
  id: string,
  content: string,
): BriefCopyBody {
  if (!body.blocks.some((block) => block.id === id && block.type === "section"))
    throw new Error(
      "Select an existing section in this exact copied document.",
    );
  return briefCopyBodySchema.parse({
    ...body,
    blocks: body.blocks.map((block) =>
      block.id === id ? { ...block, content } : block,
    ),
  });
}
export function parseCopyBody(text: string): BriefCopyBody {
  return briefCopyBodySchema.parse(JSON.parse(text));
}
