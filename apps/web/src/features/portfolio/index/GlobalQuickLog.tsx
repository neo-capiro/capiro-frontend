"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import type { Client } from "./contracts";
import { MemberQuickLog } from "@/features/portfolio/relationships/public";
import { QuickLog } from "@/features/portfolio/client-profile/public";
import styles from "./quick-log.module.css";
export function GlobalQuickLog({ clients }: { clients: Client[] }) {
  const params = useSearchParams();
  return <QuickLogSession clients={clients} open={params.has("log")} />;
}
function QuickLogSession({
  clients,
  open,
}: {
  clients: Client[];
  open: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [loggingClientId, setLoggingClientId] = useState("");
  const [showCommand, setShowCommand] = useState(false);
  const [mode, setMode] = useState<"client" | "member">("client");
  const [visitedMember, setVisitedMember] = useState(false);
  const availableClients = clients.filter(
    (client) => client.status !== "archived",
  );
  const selectedClient = availableClients.find(
    (client) => client.id === clientId,
  );
  const loggingClient = availableClients.find(
    (client) => client.id === loggingClientId,
  );
  const close = () => {
    // Keep the mounted client log's verified Undo receipt, but begin the next
    // invocation at the destination chooser as the prior URL-scoped flow did.
    setShowCommand(false);
    setClientId("");
    setMode("client");
    setVisitedMember(false);
    const next = new URLSearchParams(params);
    next.delete("log");
    router.replace(`/portfolio?${next}`, { scroll: false });
  };
  return (
    <>
      {loggingClient && (
        <QuickLog
          key={loggingClient.id}
          clientId={loggingClient.id}
          clientName={loggingClient.name}
          open={open && showCommand}
          onChangeClient={() => {
            setClientId("");
            setShowCommand(false);
          }}
          onOpenChange={(open) => {
            if (!open) close();
          }}
        />
      )}
      {open && (!showCommand || !loggingClient) && (
        <Dialog
          open
          title="Quick log"
          description="Record an activity for a client or a shared Directory note on a member."
          className={styles.dialog}
          headerActions={
            <span className={styles.info} aria-hidden="true">
              i
            </span>
          }
          onOpenChange={(open) => {
            if (!open) close();
          }}
        >
          <div className={styles.modes}>
            <span className="eyebrow">Log to</span>
            <div role="group" aria-label="Log destination">
              <button
                className={styles.mode}
                type="button"
                aria-pressed={mode === "client"}
                onClick={() => setMode("client")}
              >
                Client
              </button>
              <button
                className={styles.mode}
                type="button"
                aria-pressed={mode === "member"}
                onClick={() => {
                  setClientId("");
                  setVisitedMember(true);
                  setMode("member");
                }}
              >
                Member
              </button>
            </div>
          </div>
          <div hidden={mode !== "client"}>
            <form
              className="stack"
              onSubmit={(event) => {
                event.preventDefault();
                if (selectedClient) {
                  setLoggingClientId(selectedClient.id);
                  setShowCommand(true);
                }
              }}
            >
              <label>
                Client
                <select
                  required
                  value={selectedClient?.id ?? ""}
                  onChange={(event) => setClientId(event.target.value)}
                >
                  <option value="">Select client</option>
                  {availableClients.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button primary" disabled={!selectedClient}>
                Continue
              </button>
            </form>
          </div>
          <div hidden={mode !== "member"}>
            {visitedMember && <MemberQuickLog open />}
          </div>
        </Dialog>
      )}
    </>
  );
}
