"use client";

// WS-22 mounted generation host. This is the component the Workspace draft
// screen renders: it resolves the acting Workspace role from the existing
// collaboration owner, issues exactly the reads `useGenerationReads` allows, and
// renders the control panel once a document state was admitted.
//
// The guard lives in `authorizeGenerationDispatch`, which the panel and the
// dispatching child both consult, so an action whose owner is unactivated - or a
// role without the required capability - is refused before a request is sent,
// and an unconfirmed write result is re-read rather than retried.
import { Panel, StatusPanel } from "../../../../shared/module-ui";
import { GeneratePanel } from "./GeneratePanel";
import { IntakePanel } from "./IntakePanel";
import {
  useGenerationDispatch,
  useGenerationReads,
  type GenerationReads,
} from "./use-generation-panel";
import { useWorkspaceActionRole } from "./use-action-role";
import type { ResolvedWorkspaceRole } from "./access";

export function GenerationPanelHost({ draftId }: { draftId: string }) {
  const role = useWorkspaceActionRole(draftId);
  const reads = useGenerationReads(draftId);
  return (
    <section>
      <Panel title="Document agent">
        <StatusPanel
          loading={role.loading && !role.role}
          error={role.error}
          onRetry={role.reload}
        >
          <StatusPanel
            loading={reads.loading}
            error={reads.error}
            onRetry={reads.reload}
          >
            {reads.agent && (
              <GenerationControls
                draftId={draftId}
                reads={reads}
                role={role.role}
              />
            )}
          </StatusPanel>
        </StatusPanel>
      </Panel>
      <IntakePanel
        capability={reads.capability}
        actor={role.actor}
        role={role.role}
        onSettled={reads.reload}
      />
    </section>
  );
}

/**
 * Rendered only for an admitted document state, so the canonical client is
 * resolved exactly when there is something to act on.
 */
function GenerationControls({
  draftId,
  reads,
  role,
}: {
  draftId: string;
  reads: GenerationReads;
  role: ResolvedWorkspaceRole;
}) {
  const { busy, notice, failure, dispatch } = useGenerationDispatch(
    role,
    reads.reload,
  );
  return (
    <>
      {notice && <p role="status">{notice}</p>}
      {failure && <p role="alert">{failure}</p>}
      {reads.agent && (
        <GeneratePanel
          draftId={draftId}
          state={reads.agent}
          proposals={reads.proposals}
          run={reads.run}
          quality={reads.quality}
          role={role}
          busy={busy}
          dispatch={dispatch}
        />
      )}
    </>
  );
}
