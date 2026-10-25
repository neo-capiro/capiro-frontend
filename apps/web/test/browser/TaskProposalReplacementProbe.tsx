import { useMemo, useState } from "react";
import { MeriActionWorkflow } from "../../src/features/meri/actions/MeriActionWorkflow";
import { MeriTaskUpdates } from "../../src/features/meri/task-updates/MeriTaskUpdates";

/** Keeps the real feature and controller mounted while its retained proposal changes. */
export function TaskProposalReplacementProbe({
  kind,
}: {
  kind: string | null;
}) {
  const [executions, setExecutions] = useState(0);
  const port = useMemo(() => {
    let version = 1;
    const restored = () => ({
      ok: true as const,
      value: {
        phase: "proposal" as const,
        proposal: {
          handle: {},
          reference: `proposal-${version}`,
          commandHash: String(version).repeat(64),
          title: `Reviewed task ${version}`,
          dueDate: null,
          taskId: "synthetic-task",
          patch: { title: `Reviewed task ${version}` },
          expiresAt: "2099-01-01T00:00:00.000Z",
          approverLabel: "Synthetic approver",
        },
      },
    });
    const unused = async () => ({
      ok: false as const,
      problem: "not-dispatched" as const,
    });
    return {
      restore: async () => restored(),
      retrySaved: async () => {
        version++;
        return restored();
      },
      query: unused,
      draft: unused,
      prepare: unused,
      execute: async () => {
        setExecutions((value) => value + 1);
        return unused();
      },
    };
  }, []);
  return (
    <>
      <output aria-label="Synthetic execution count">{executions}</output>
      {kind === "create" ? (
        <MeriActionWorkflow
          port={port}
          lifetimeKey="unchanged"
          contextLabel="Synthetic proposal replacement"
        />
      ) : (
        <MeriTaskUpdates port={port} lifetimeKey="unchanged" />
      )}
    </>
  );
}
