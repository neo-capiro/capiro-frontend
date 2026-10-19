import { useQueryClient } from "@tanstack/react-query";
import { refreshSetupState } from "../../lib/setup-state-read";
import { useTeamInvites } from "../../lib/use-team-invites";
import { useOnboardAttempt } from "../../lib/use-onboard-attempt";
import { AttemptStatus, PendingFields } from "../../ui/AttemptStatus";
// 2A — Send team invites (final unlocked step). Prototype InvitesOverlay wired
// to POST /api/tenant-admin/team/invite (one call per row) and
// POST /onboard-api/setup/complete once at least one invite lands.
import React from "react";
import { Btn, Icon, Modal, SelectInput, TextInput } from "../../ui/primitives";
import { errorMessage } from "../funnel/shared";
import { useCapiroApi } from "../../lib/capiro-api";
import { useSetupApi } from "../../lib/setup";

type RoleLabel = "Standard User" | "Admin";

interface InviteRow {
  email: string;
  role: RoleLabel;
}

const emptyRow = (): InviteRow => ({ email: "", role: "Standard User" });

export function InvitesOverlay({
  orgName,
  appBaseUrl,
  onClose,
  onCompleted,
}: {
  orgName: string;
  appBaseUrl: string;
  onClose: () => void;
  /** Setup completed (≥1 invite sent + POST /setup/complete) — parent refetches. */
  onCompleted: () => void;
}) {
  const capiro = useCapiroApi();
  const cache = useQueryClient();
  const setupApi = useSetupApi();
  const batch = useTeamInvites(capiro);
  const completion = useOnboardAttempt(setupApi, "setup-completion");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [rows, setRows] = React.useState<InviteRow[]>([
    emptyRow(),
    emptyRow(),
    emptyRow(),
  ]);
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [sentCount, setSentCount] = React.useState(0);
  const [failures, setFailures] = React.useState<string[]>([]);

  const valid = rows.filter((r) => r.email.includes("@"));
  const setRow = (i: number, patch: Partial<InviteRow>) => {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  };

  /** Minimal bulk CSV: one `email[,role]` per line, appended as rows. */
  const handleCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const guard = batch.guard();
    void guard
      .wait(() => file.text())
      .then((text) => {
        if (batch.blocked()) return;
        const parsed: InviteRow[] = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [email, role] = line.split(",").map((s) => s.trim());
            return {
              email: email ?? "",
              role: (/admin/i.test(role ?? "")
                ? "Admin"
                : "Standard User") as RoleLabel,
            };
          })
          .filter((r) => r.email.includes("@"));
        if (parsed.length > 0) {
          setRows((prev) => [
            ...prev.filter((r) => r.email.trim() !== ""),
            ...parsed,
          ]);
        }
      })
      .catch(() => {
        /* A closed/replaced CSV review cannot change this draft. */
      });
  };

  const send = async () => {
    if (sending || batch.blocked() || valid.length === 0) return;
    setSending(true);
    setFailures([]);
    try {
      const outcomes = await batch.run(
        valid.map((row) => ({
          email: row.email.trim(),
          role: row.role === "Admin" ? "user_admin" : "standard_user",
        })),
      );
      setSentCount(outcomes.filter((row) => row.status === "confirmed").length);
      setSent(true);
    } catch (err) {
      setFailures([errorMessage(err)]);
    } finally {
      setSending(false);
    }
  };
  const finishSetup = async () => {
    if (completion.blocked()) return;
    try {
      await completion.run(
        "Finish setup with the confirmed current prerequisites",
        async (guard) => {
          const result = await guard.wait(() => setupApi.completeSetup());
          if (!result.complete)
            throw new Error(
              "Setup completion is not confirmed. Review the current setup tasks.",
            );
          onCompleted();
        },
      );
    } catch (err) {
      setFailures([errorMessage(err)]);
    }
  };
  const readCurrent = async () => {
    try {
      await completion.reconcile(
        () => refreshSetupState(cache, setupApi.getState),
        (state) => state.complete,
      );
      onCompleted();
    } catch (err) {
      setFailures([errorMessage(err)]);
    }
  };

  return (
    <Modal title="Invite your team" onClose={onClose} width={560}>
      <AttemptStatus record={batch.record} />
      <AttemptStatus
        record={completion.record}
        check={() => void readCurrent()}
      />
      {!!batch.outcomes?.length && (
        <ul aria-label="Invitation outcomes">
          {batch.outcomes.map((row, i) => (
            <li key={i}>
              {row.email} · {row.role} ·{" "}
              {row.status === "confirmed"
                ? "invitation created; delivery unconfirmed"
                : row.status}
            </li>
          ))}
        </ul>
      )}
      {batch.outcomes?.some((row) => row.status === "confirmed") && (
        <Btn
          disabled={completion.locked || batch.pending}
          onClick={() => void finishSetup()}
        >
          Finish setup
        </Btn>
      )}
      <PendingFields disabled={batch.locked || completion.pending}>
        {!sent ? (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 160px",
                  gap: 10,
                }}
              >
                <TextInput
                  placeholder="name@firm.com"
                  value={r.email}
                  onChange={(e) => setRow(i, { email: e.target.value })}
                />
                <SelectInput
                  options={["Standard User", "Admin"]}
                  value={r.role}
                  onChange={(v) => setRow(i, { role: v as RoleLabel })}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setRows((prev) => [...prev, emptyRow()]);
                }}
                style={{
                  fontSize: 12.5,
                  color: "var(--accent)",
                  fontWeight: 600,
                }}
              >
                + Add another
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  fileRef.current?.click();
                }}
                style={{
                  fontSize: 12.5,
                  color: "var(--accent)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Icon name="FileUp" size={12} />
                Bulk CSV import
              </a>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={handleCsv}
              />
            </div>
            {failures.length > 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--critical)",
                  lineHeight: 1.5,
                }}
              >
                {failures.map((f, i) => (
                  <div key={i}>{f}</div>
                ))}
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                borderTop: "1px solid var(--border-1)",
                paddingTop: 14,
              }}
            >
              <Btn onClick={onClose}>Cancel</Btn>
              <Btn
                variant="primary"
                disabled={valid.length === 0 || sending}
                onClick={() => void send()}
              >
                {sending
                  ? "Sending…"
                  : `Send ${valid.length} Invite${valid.length === 1 ? "" : "s"}`}
              </Btn>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "14px 0 4px" }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "var(--success-soft)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 14px",
              }}
            >
              <Icon
                name="Check"
                size={22}
                strokeWidth={2.6}
                style={{ color: "var(--success)" }}
              />
            </div>
            <b style={{ fontSize: 15 }}>Invites sent</b>
            <p
              style={{
                margin: "6px 0 18px",
                fontSize: 12.5,
                color: "var(--ink-2)",
              }}
            >
              {sentCount} teammates will get an email to join {orgName}. Each
              connects their own email and calendar on first login.
            </p>
            {failures.length > 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--critical)",
                  lineHeight: 1.5,
                  margin: "0 0 14px",
                }}
              >
                {failures.map((f, i) => (
                  <div key={i}>{f}</div>
                ))}
              </div>
            )}
            <Btn
              variant="primary"
              onClick={() => window.location.assign(appBaseUrl)}
              icon="ArrowRight"
              style={{ width: "100%" }}
            >
              Continue to Capiro
            </Btn>
          </div>
        )}
      </PendingFields>
    </Modal>
  );
}
