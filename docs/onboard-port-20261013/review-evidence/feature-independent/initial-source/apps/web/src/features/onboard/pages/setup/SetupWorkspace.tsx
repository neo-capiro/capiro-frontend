import { AttemptStatus } from "../../ui/AttemptStatus";
import React from "react";
import { Btn } from "../../ui/primitives";
import { useConfig } from "../../useConfig";
import { errorMessage } from "../funnel/shared";
import { type SetupState } from "../../lib/setup";
import { ExtShell, TaskCard } from "./ExtShell";
import { ImportOverlay } from "./ImportOverlay";
import { AiSettingsOverlay } from "./AiSettingsOverlay";
import { InvitesOverlay } from "./InvitesOverlay";
import { useSetupActions } from "./useSetupActions";
import { EmailSetupTask } from "./EmailSetupTask";
import { ClientImportTask } from "./ClientImportTask";
export function SetupWorkspace({
  state: S,
  firstName,
  billingAdmin,
  refresh: refetch,
}: {
  state: SetupState;
  firstName: string | null;
  billingAdmin: boolean;
  refresh: () => Promise<void>;
}) {
  const config = useConfig();
  const [overlay, setOverlay] = React.useState<
    null | "import" | "ai" | "invites"
  >(null);
  const actions = useSetupActions(S, refetch);
  const {
    inviteWrite,
    importTask,
    memoryTask,
    setItError,
    transitionToDone,
    setupApi,
  } = actions;
  const tasks = S.tasks;

  const emailDone = tasks.it_email === "done";
  const emailSkipped = tasks.it_email === "skipped";
  // 'skipped' = the invited Google admin deferred verification (Google
  // Testing-mode can't yet serve every customer) — resolves the step the same
  // as 'done' for unlocking, mirrors the server-side gate in
  // setup.service.completeSetup, just rendered distinctly (amber, not green).
  const emailResolved = emailDone || emailSkipped;
  const importDone = tasks.import === "done";
  const aiDone = tasks.firm_ai === "done";
  const doneCount = [
    emailResolved,
    importDone,
    aiDone,
    tasks.invites === "done",
  ].filter(Boolean).length;
  // Firm AI settings are OPTIONAL — only email + import gate the team invites
  // (mirrors the server-side blockers in setup.service.completeSetup).
  const invitesUnlocked = emailResolved && importDone;

  const cap = S.cap;
  const managedImport = S.importMode === "managed";

  return (
    <ExtShell orgName={S.orgName}>
      <AttemptStatus record={inviteWrite.record} check={() => void refetch()} />
      <AttemptStatus
        record={importTask.record}
        check={() =>
          void importTask
            .reconcile(
              () => setupApi.getState(),
              (value) => value.tasks.import === "done",
            )
            .then(() => refetch())
            .catch((err) => setItError(errorMessage(err)))
        }
      />
      <AttemptStatus
        record={memoryTask.record}
        check={() =>
          void memoryTask
            .reconcile(
              () => setupApi.getState(),
              (value) => value.tasks.firm_ai === "done",
            )
            .then(() => refetch())
            .catch((err) => setItError(errorMessage(err)))
        }
      />
      {!managedImport && !importDone && S.imported > 0 && (
        <Btn
          disabled={importTask.locked}
          onClick={() => void transitionToDone("import")}
        >
          Mark import step complete
        </Btn>
      )}
      <div
        style={{
          marginBottom: 8,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
              fontSize: 28,
              letterSpacing: "-0.015em",
            }}
          >
            {firstName ? `Welcome, ${firstName}.` : "Welcome."}
          </h1>
          <p
            style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--ink-2)" }}
          >
            Complete the steps below to launch your Capiro workspace.
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--ink-2)",
              fontFamily: "var(--font-mono)",
              letterSpacing: 0,
            }}
          >
            {doneCount} of 4 steps complete
          </div>
          <div
            style={{
              width: 170,
              height: 5,
              background: "var(--bg-sunken)",
              border: "1px solid var(--border-1)",
              borderRadius: 99,
              marginTop: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(doneCount / 4) * 100}%`,
                height: "100%",
                background: "var(--accent)",
                borderRadius: 99,
                transition: "width 0.4s ease",
              }}
            ></div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
        {/* Task 1 — Connect email provider */}
        <EmailSetupTask {...actions} status={tasks.it_email} />

        {/* Task 2 — Import client profiles. Capiro-managed is EXCLUSIVELY a
            Capiro-run path: no customer self-import, no "mark complete" here.
            The card is informational; a Capiro team member marks it done from
            the admin panel once the clients are in (that flips tasks.import). */}
        <ClientImportTask state={S} onOpen={() => setOverlay("import")} />

        {/* Task 3 — Firm AI settings (OPTIONAL — does not gate invites) */}
        <TaskCard
          num="3"
          title="Configure firm AI settings"
          status={tasks.firm_ai}
          desc="Optional — set guardrails, tone, and preferences for your whole team. You can also do this later from Settings."
          action={
            tasks.firm_ai === "done" ? (
              <Btn size="sm" onClick={() => setOverlay("ai")}>
                Edit
              </Btn>
            ) : (
              <Btn variant="primary" size="sm" onClick={() => setOverlay("ai")}>
                Configure
              </Btn>
            )
          }
        />

        {/* Task 4 — Invite team (gated) */}
        <TaskCard
          num="4"
          title="Invite your team"
          locked={!invitesUnlocked}
          status={
            tasks.invites === "done"
              ? "done"
              : invitesUnlocked
                ? "none"
                : "locked"
          }
          desc={
            invitesUnlocked
              ? "Your workspace is ready for the rest of the firm."
              : "Available once the email provider is connected and clients are imported."
          }
          action={
            invitesUnlocked && tasks.invites !== "done" ? (
              <Btn
                variant="primary"
                size="sm"
                onClick={() => setOverlay("invites")}
              >
                Send Invites
              </Btn>
            ) : tasks.invites === "done" ? (
              <Btn
                variant="primary"
                size="sm"
                onClick={() => window.location.assign(config.appBaseUrl)}
                icon="ArrowRight"
              >
                Continue to Capiro
              </Btn>
            ) : null
          }
        />
      </div>

      {overlay === "import" && (
        <ImportOverlay
          cap={cap}
          imported={S.imported}
          plan={S.plan}
          billingAdmin={billingAdmin}
          onClose={() => setOverlay(null)}
          onImported={async () => {
            await refetch();
          }}
        />
      )}
      {overlay === "ai" && (
        <AiSettingsOverlay
          orgName={S.orgName}
          onClose={() => setOverlay(null)}
          onComplete={() => {
            setOverlay(null);
            void transitionToDone("firm_ai");
          }}
        />
      )}
      {overlay === "invites" && (
        <InvitesOverlay
          orgName={S.orgName}
          appBaseUrl={config.appBaseUrl}
          onClose={() => setOverlay(null)}
          onCompleted={() => void refetch()}
        />
      )}
    </ExtShell>
  );
}
