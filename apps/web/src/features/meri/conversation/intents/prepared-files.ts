import type { IntentsItem } from "@capiro/meri-client/intents";

export type ConversationFile = Readonly<{
  versionId: string;
  prepared?: true;
}>;

/** A retained draft is readable through the artifact owner without claiming publication. */
export function conversationFiles(
  published: readonly ConversationFile[],
  items: readonly IntentsItem[],
): readonly ConversationFile[] {
  const files = new Map(published.map((file) => [file.versionId, file]));
  for (const item of items) {
    if (
      item.state === "prepared" &&
      item.kind === "draft" &&
      "versionId" in item &&
      !files.has(item.versionId)
    )
      files.set(item.versionId, { versionId: item.versionId, prepared: true });
  }
  return [...files.values()];
}
