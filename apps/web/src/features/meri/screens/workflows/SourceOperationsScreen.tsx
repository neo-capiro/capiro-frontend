import { Notice } from "../../ui/Notice";
import {
  SourceCoverageList,
  type SourceCoverageView,
} from "./SourceCoverageRow";
import { ToolingPage } from "./ToolingPage";

export type SourceOperationsView = {
  description: string;
  domains: readonly SourceCoverageView[];
};

/** 12.04 Source access & operations: each permitted domain, its scope and qualified operations. */
export function SourceOperationsScreen({
  view,
  backHref,
  unavailable,
}: {
  view: SourceOperationsView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="Source access & operations"
      description={view.description}
      backHref={backHref}
      unavailable={unavailable}
    >
      <Notice title="Read access and action access are separate">
        Selected source actions: memory proposals/review, task creation and
        exact-version artifact filing. Email sending, calendar creation and
        broader source writes are not enabled.
      </Notice>
      <SourceCoverageList
        label={`${view.domains.length} source domains`}
        rows={view.domains}
      />
      <Notice title="Source limitations stay visible">
        Unsupported encrypted fields, unavailable history, truncated records or
        unqualified operations are disclosed in the result. A searchable source
        does not imply every native workflow is enabled.
      </Notice>
    </ToolingPage>
  );
}
