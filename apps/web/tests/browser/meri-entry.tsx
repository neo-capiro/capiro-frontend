import { createRoot } from "react-dom/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApplicationBoundary } from "@/shared/session/ApplicationBoundary";
import { RequireSession } from "@/shared/session/SessionContext";
import { useEntityEntry } from "@/shared/meri-entry/public";
import { MeriHome } from "@/features/meri/MeriHome";
import { WorkspaceDraft } from "@/features/modules/workspace/WorkspaceDraft";
import { TaskDetail } from "@/features/modules/planner/TaskDetail";
import { useCapiroQuery } from "@/shared/capiro/queries";
import { StatusPanel } from "@/shared/module-ui";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

function SourceTask() {
  const query = useCapiroQuery("planner.task", {
    params: { id: "00000000-0000-4000-8000-000000000005" },
  });
  return (
    <StatusPanel loading={query.loading} error={query.error}>
      {query.data && (
        <TaskDetail
          task={query.data}
          people={[]}
          projects={[]}
          onClose={() => {}}
          onSaved={query.reload}
        />
      )}
    </StatusPanel>
  );
}
function Harness() {
  const pathname = usePathname(),
    router = useRouter(),
    source = useSearchParams().get("source");
  const clientId = "00000000-0000-4000-8000-000000000003";
  const draft = useEntityEntry(
    clientId,
    {
      source: "workspace-draft",
      draftId: "00000000-0000-4000-8000-000000000004",
    },
    true,
  );
  const task = useEntityEntry(
    clientId,
    { source: "planner-task", taskId: "00000000-0000-4000-8000-000000000005" },
    true,
  );
  return (
    <main className="page">
      <h1>Synthetic Meri entity entry qualification</h1>
      {source ? (
        source === "task" ? (
          <SourceTask />
        ) : (
          <WorkspaceDraft
            id="00000000-0000-4000-8000-000000000004"
            onClose={() => {}}
          />
        )
      ) : (
        <>
          <button disabled={!draft.ready} onClick={draft.open}>
            Ask about synthetic draft
          </button>
          <button disabled={!task.ready} onClick={task.open}>
            Ask about synthetic task
          </button>
          <button onClick={() => router.push("/meri?scope=general")}>
            Switch to General
          </button>
        </>
      )}
      {pathname === "/meri" && <MeriHome />}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <ApplicationBoundary publishableKey="pk_test_c3ludGhldGljLmV4YW1wbGUudGVzdCQ">
    <RequireSession>
      <Harness />
    </RequireSession>
  </ApplicationBoundary>,
);
