import { Btn, Icon } from "../../ui/primitives";
import { type SetupState } from "../../lib/setup";
import { TaskCard } from "./ExtShell";
export function ClientImportTask({
  state: S,
  onOpen,
}: {
  state: SetupState;
  onOpen: () => void;
}) {
  const tasks = S.tasks,
    cap = S.cap,
    atCap = S.imported >= cap,
    managedImport = S.importMode === "managed";
  return managedImport ? (
    <TaskCard
      num="2"
      title="Import client profiles"
      status={tasks.import}
      desc="Capiro-managed — our team adds your clients for you."
    >
      <div
        style={{
          fontSize: 12.5,
          color: "var(--ink-2)",
          lineHeight: 1.55,
        }}
      >
        {tasks.import === "done" ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              color: "var(--success)",
              fontWeight: 600,
            }}
          >
            <Icon name="CircleCheck" size={15} />
            Client import complete ({S.imported} added).
          </span>
        ) : (
          <>
            Capiro will reach out via email within 1 business day to gather your
            client list. This step will be marked completed once your clients
            have been added.
          </>
        )}
      </div>
    </TaskCard>
  ) : (
    <TaskCard
      num="2"
      title="Import client profiles"
      status={tasks.import}
      desc={`Add your client portfolio. Limit: ${cap} client profiles (${S.plan === "paid" ? "paid" : "trial"}).`}
      action={
        <Btn
          variant={tasks.import === "none" ? "primary" : "secondary"}
          size="sm"
          onClick={() => onOpen()}
        >
          {tasks.import === "none"
            ? "Start Import"
            : tasks.import === "done"
              ? "Import more"
              : "Continue Import"}
        </Btn>
      }
    >
      {tasks.import !== "none" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              flex: 1,
              height: 5,
              background: "var(--bg-sunken)",
              border: "1px solid var(--border-1)",
              borderRadius: 99,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, (S.imported / cap) * 100)}%`,
                height: "100%",
                background: atCap ? "var(--notable)" : "var(--accent)",
                borderRadius: 99,
                transition: "width 0.3s ease",
              }}
            ></div>
          </div>
          <span
            style={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              letterSpacing: 0,
              color: "var(--ink-2)",
            }}
          >
            {S.imported} of {cap} client profiles imported
          </span>
        </div>
      )}
    </TaskCard>
  );
}
