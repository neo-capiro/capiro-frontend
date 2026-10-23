"use client";

import { useState } from "react";
import type { OperationResponse } from "../../../shared/capiro/contracts";
import type { analystOperations } from "../../../shared/capiro/operations/settings-admin/analyst";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  Badge,
  DataTable,
  StatusPanel,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
} from "../components";
import styles from "../styles";
import { useSettingsMutation } from "../useSettingsMutation";
import { SettingsMutationNotice } from "../SettingsMutationNotice";
import { QueuePagination } from "./QueuePagination";

type Item = OperationResponse<
  (typeof analystOperations)["settings.analyst.reconciliation.list"]
>["data"][number];

export function ReconciliationQueue() {
  const { api, action, pending, reconcile, locked } = useSettingsMutation(
    "analyst-reconciliation",
  );
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const query = useCapiroQuery("settings.analyst.reconciliation.list", {
    query: { status, page, limit: 25 },
  });
  const [manual, setManual] = useState<Item>();
  const [manualValue, setManualValue] = useState("");
  const [notes, setNotes] = useState("");
  function decide(
    item: Item,
    decision: "keep_current" | "accept_conflicting" | "manual_value",
  ) {
    return action.run(
      (signal) =>
        api.request(
          "settings.analyst.reconciliation.resolve",
          {
            params: { id: item.id },
            body: {
              decision,
              ...(decision === "manual_value" ? { manualValue } : {}),
              ...(notes ? { notes } : {}),
            },
          },
          { signal },
        ),
      (result) =>
        result.pendingApproval
          ? "The proposed value requires approval by a second administrator. The canonical value has not changed."
          : result.resolved
            ? "Reconciliation review was resolved."
            : "Review request completed. Reload the queue for its current status.",
      () => {
        setManual(undefined);
        setManualValue("");
        setNotes("");
        query.reload();
      },
    );
  }
  return (
    <div className={styles.stack} data-design-target="411:77237">
      <SettingsCard
        title="Reconciliation Review Queue"
        action={
          <select
            disabled={locked}
            className={styles.input}
            aria-label="Reconciliation status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="open">Open</option>
            <option value="pending_approval">Pending approval</option>
            <option value="resolved">Resolved</option>
          </select>
        }
      >
        <StatusPanel
          loading={query.loading}
          error={query.error}
          onRetry={query.reload}
        >
          <DataTable
            rows={query.data?.data ?? []}
            rowKey={(row) => row.id}
            caption="Program element reconciliation review"
            columns={[
              { key: "pe", label: "PE code", render: (row) => row.peCode },
              { key: "fy", label: "FY", render: (row) => `FY${row.fy}` },
              { key: "field", label: "Field", render: (row) => row.fieldName },
              {
                key: "current",
                label: "Canonical",
                render: (row) => row.currentValue ?? "—",
              },
              {
                key: "source",
                label: "Conflicting source",
                render: (row) => row.conflictingSource,
              },
              {
                key: "conflicting",
                label: "Conflicting",
                render: (row) => row.conflictingValue ?? "—",
              },
              {
                key: "delta",
                label: "Δ%",
                render: (row) =>
                  row.deltaPct === null ? "—" : `${row.deltaPct}%`,
              },
              {
                key: "status",
                label: "Status",
                render: (row) => (
                  <Badge
                    tone={
                      row.status === "pending_approval" ? "warning" : "neutral"
                    }
                  >
                    {row.status}
                  </Badge>
                ),
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) =>
                  row.status === "open" ? (
                    <div className={styles.row}>
                      <SettingsButton
                        small
                        disabled={locked}
                        onClick={() => void decide(row, "keep_current")}
                      >
                        Keep
                      </SettingsButton>
                      <SettingsButton
                        primary
                        small
                        disabled={locked}
                        onClick={() => void decide(row, "accept_conflicting")}
                      >
                        Accept
                      </SettingsButton>
                      <SettingsButton
                        small
                        disabled={locked}
                        onClick={() => {
                          setManual(row);
                          setManualValue("");
                          setNotes("");
                          action.clear();
                        }}
                      >
                        Manual…
                      </SettingsButton>
                    </div>
                  ) : row.status === "pending_approval" ? (
                    <SettingsButton
                      small
                      disabled={locked}
                      onClick={() =>
                        void action.run(
                          (signal) =>
                            api.request(
                              "settings.analyst.reconciliation.approve",
                              { params: { id: row.id } },
                              { signal },
                            ),
                          "The second administrator approval was recorded.",
                          query.reload,
                        )
                      }
                    >
                      Approve proposed value
                    </SettingsButton>
                  ) : (
                    "—"
                  ),
              },
            ]}
          />
          {query.data && (
            <QueuePagination
              page={query.data.page}
              total={query.data.total}
              limit={query.data.limit}
              onChange={setPage}
            />
          )}
        </StatusPanel>
      </SettingsCard>
      <SettingsMutationNotice
        pending={pending}
        busy={action.busy}
        reconcile={reconcile}
      />
      {action.error && (
        <SettingsNotice title="Reconciliation action failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <SettingsDialog
        busy={action.busy}
        open={!!manual}
        onClose={() => setManual(undefined)}
        title={`Manual value, ${manual?.peCode ?? ""} FY${manual?.fy ?? ""} ${manual?.fieldName ?? ""}`}
        footer={
          <>
            <SettingsButton
              disabled={locked}
              onClick={() => setManual(undefined)}
            >
              Cancel
            </SettingsButton>
            <SettingsButton
              primary
              form="manual-reconciliation-value"
              type="submit"
              disabled={locked}
            >
              Apply value
            </SettingsButton>
          </>
        }
      >
        <form
          id="manual-reconciliation-value"
          className={styles.stack}
          onSubmit={(event) => {
            event.preventDefault();
            if (manual) void decide(manual, "manual_value");
          }}
        >
          <SettingField label="Value ($ millions)">
            <TextInput
              disabled={locked}
              required
              inputMode="decimal"
              pattern="-?(0|[1-9][0-9]*)(\.[0-9]+)?"
              value={manualValue}
              placeholder="0.00"
              onChange={(event) => setManualValue(event.target.value)}
            />
          </SettingField>
          <SettingField label="Notes (optional)">
            <TextArea
              disabled={locked}
              maxLength={10000}
              value={notes}
              placeholder="Why this value?"
              onChange={(event) => setNotes(event.target.value)}
            />
          </SettingField>
          <p className={styles.description}>
            Values requiring a second administrator remain pending until
            approved.
          </p>
          <SettingsMutationNotice
            pending={pending}
            busy={action.busy}
            reconcile={reconcile}
          />
          {action.error && (
            <SettingsNotice title="Manual value could not be submitted" error>
              {action.error}
            </SettingsNotice>
          )}
        </form>
      </SettingsDialog>
    </div>
  );
}
