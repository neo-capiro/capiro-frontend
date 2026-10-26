"use client";
import { useState } from "react";
import type { NewsletterBlock } from "@capiro/shared/newsletter";
import { useCapiro } from "../../../../../shared/capiro/CapiroBoundary";
import { WritingTool } from "./WritingTool";
import { AltTextTool } from "./AltTextTool";
import { RefineImageTool } from "./RefineImageTool";
import { VideoThumbnailTool } from "./VideoThumbnailTool";
import { LinkPreviewTool } from "./LinkPreviewTool";

type Props = {
  documentId?: string;
  block: NewsletterBlock;
  update: (change: Partial<NewsletterBlock>) => void;
};
/** Canonical scope and the editor's document/block key replace every command lifetime. */
export function BlockProviderTools(props: Props) {
  const api = useCapiro();
  const [scope, setScope] = useState({ api, version: 0 });
  if (scope.api !== api) setScope({ api, version: scope.version + 1 });
  if (
    !["heading", "paragraph", "image", "logo", "video", "apps"].includes(
      props.block.kind,
    )
  )
    return null;
  if (!props.documentId)
    return (
      <p>Open or create a saved newsletter before using provider tools.</p>
    );
  return (
    <Tools
      key={`${scope.version}:${props.documentId}:${props.block.id}`}
      {...props}
      documentId={props.documentId}
    />
  );
}
function Tools(props: Props & { documentId: string }) {
  const kind = props.block.kind;
  return (
    <>
      {(kind === "heading" || kind === "paragraph") && (
        <WritingTool {...props} />
      )}
      {(kind === "image" || kind === "logo") && (
        <>
          <AltTextTool {...props} />
          <RefineImageTool {...props} />
        </>
      )}
      {kind === "video" && <VideoThumbnailTool {...props} />}
      {kind === "apps" && <LinkPreviewTool {...props} />}
    </>
  );
}
