"use client";
import { useEffect, useState } from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import type { ResearchDetail } from "../../../../shared/capiro/operations/research-schemas";
import type {
  ResearchDashboardDesign,
  ResearchDashboardLayout,
  ResearchShareLink,
} from "../../../../shared/capiro/operations/research-share-schemas";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Field,
  Modal,
  Panel,
  SelectInput,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import { defaultLayout } from "./dashboard-layout";
import { DashboardDesigner } from "./DashboardDesigner";
import { PublishShareDialog } from "./PublishShareDialog";
import { buildPreviewDashboard } from "./preview-dashboard";
import styles from "./share.module.css";

const PIN_RULE = /^[0-9]{6,12}$/;
function SharePinAttempts({ link }: { link: ResearchShareLink }) {
  const [now, setNow] = useState(() => Date.now());
  const until = link.lockedUntil ? Date.parse(link.lockedUntil) : 0;
  useEffect(() => {
    const remaining = until - Date.now();
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.max(0, Math.min(remaining + 1, 2147483647)),
    );
    return () => clearTimeout(timer);
  }, [until]);
  return until > now ? (
    <Badge tone="warning">
      {link.failedPinAttempts} · locked until {when(link.lockedUntil)}
    </Badge>
  ) : (
    <>{link.failedPinAttempts}</>
  );
}
function when(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : "—";
}
function useAction(onDone?: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      onDone?.();
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The action could not be completed",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run, clear: () => setError(undefined) };
}

/** Sharing tab: PIN and switch, dashboard designs, and the one-week client links. */
export function ResearchSharing({ portfolio }: { portfolio: ResearchDetail }) {
  const params = { id: portfolio.id };
  const settings = useCapiroQuery("research.sharing", { params });
  const designs = useCapiroQuery("research.designs", { params });
  const links = useCapiroQuery("research.shareLinks", { params });
  const [editing, setEditing] = useState<{
    design?: ResearchDashboardDesign;
  } | null>(null);
  if (editing)
    return (
      <DesignEditor
        portfolio={portfolio}
        design={editing.design}
        onDone={() => {
          setEditing(null);
          designs.reload();
        }}
      />
    );
  return (
    <div className={styles.stack}>
      <StatusPanel
        loading={settings.loading}
        error={settings.error}
        onRetry={settings.reload}
      >
        {settings.data && (
          <SharingSettings
            portfolio={portfolio}
            enabled={settings.data.enabled}
            tenantEnabled={settings.data.tenantEnabled}
            pinUpdatedAt={settings.data.pinUpdatedAt}
            activeLinkCount={settings.data.activeLinkCount}
            onChanged={() => {
              settings.reload();
              links.reload();
            }}
          />
        )}
      </StatusPanel>
      <Panel
        title="Dashboard designs"
        description="Arrange what a recipient sees. Each published link freezes the design version it was published with."
        actions={
          portfolio.myRole !== "viewer" && (
            <ActionButton primary onClick={() => setEditing({})}>
              New design
            </ActionButton>
          )
        }
      >
        <StatusPanel
          loading={designs.loading}
          error={designs.error}
          onRetry={designs.reload}
        >
          <DataTable
            rows={designs.data ?? []}
            rowKey={(d) => d.id}
            caption="Dashboard designs"
            emptyMessage="No designs yet. Create one to publish a link."
            columns={[
              { key: "name", label: "Design", render: (d) => d.name },
              { key: "version", label: "Version", render: (d) => d.version },
              {
                key: "widgets",
                label: "Widgets",
                render: (d) => d.layout.widgets.length,
              },
              {
                key: "updated",
                label: "Updated",
                render: (d) => when(d.updatedAt),
              },
              {
                key: "actions",
                label: "Actions",
                render: (d) =>
                  portfolio.myRole === "viewer" ? null : (
                    <ActionButton onClick={() => setEditing({ design: d })}>
                      Edit
                    </ActionButton>
                  ),
              },
            ]}
          />
        </StatusPanel>
      </Panel>
      <ShareLinks
        portfolio={portfolio}
        enabled={settings.data?.enabled ?? false}
        tenantEnabled={settings.data?.tenantEnabled ?? false}
        designs={designs.data ?? []}
        links={links}
        onChanged={() => {
          links.reload();
          settings.reload();
        }}
      />
    </div>
  );
}

function SharingSettings({
  portfolio,
  enabled,
  tenantEnabled,
  pinUpdatedAt,
  activeLinkCount,
  onChanged,
}: {
  portfolio: ResearchDetail;
  enabled: boolean;
  tenantEnabled: boolean;
  pinUpdatedAt: string | null;
  activeLinkCount: number;
  onChanged: () => void;
}) {
  const api = useCapiro();
  const [pin, setPin] = useState("");
  const [confirmOff, setConfirmOff] = useState(false);
  const action = useAction(() => {
    setPin("");
    onChanged();
  });
  const owner = portfolio.myRole === "owner";
  const params = { id: portfolio.id };
  const pinField = (id: string, label: string) => (
    <Field
      label={label}
      htmlFor={id}
      description="6 to 12 digits. Recipients enter it after opening the link; share it separately from the link."
    >
      <TextInput
        id={id}
        className={styles.pin}
        inputMode="numeric"
        autoComplete="off"
        maxLength={12}
        value={pin}
        disabled={!owner || action.busy}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
      />
    </Field>
  );
  return (
    <Panel
      title="Client sharing"
      description={
        enabled
          ? `Sharing is on. ${activeLinkCount} active link${activeLinkCount === 1 ? "" : "s"}; links expire one week after publishing.`
          : "Turn on sharing and set a PIN to publish one-week links for linked clients."
      }
      actions={enabled ? <Badge tone="success">On</Badge> : <Badge>Off</Badge>}
    >
      {action.error && <p role="alert">{action.error}</p>}
      {!tenantEnabled && (
        <p role="status" className={styles.hint}>
          Client sharing is switched off for your whole workspace by an
          administrator. No link can be published or opened until it is switched
          back on in Settings, Client sharing.
        </p>
      )}
      {!owner && (
        <p className={styles.hint}>
          Only the portfolio owner can turn sharing on or off or change the PIN.
        </p>
      )}
      <div className={styles.form}>
        {enabled ? (
          <>
            <p className={styles.hint}>PIN last set {when(pinUpdatedAt)}.</p>
            {pinField("share-pin-new", "New PIN")}
            <div className={styles.inline}>
              <ActionButton
                disabled={!owner || action.busy || !PIN_RULE.test(pin)}
                onClick={() =>
                  action.run(() =>
                    api.request("research.sharing.pin", {
                      params,
                      body: { pin },
                    }),
                  )
                }
              >
                Change PIN
              </ActionButton>
              <ActionButton
                disabled={!owner || action.busy}
                onClick={() => setConfirmOff(true)}
              >
                Turn off sharing
              </ActionButton>
            </div>
            <p className={styles.hint}>
              Changing the PIN ends every recipient&apos;s current viewing
              session; existing links stay published.
            </p>
          </>
        ) : (
          <>
            {pinField("share-pin", "PIN")}
            <div>
              <ActionButton
                primary
                disabled={
                  !owner || !tenantEnabled || action.busy || !PIN_RULE.test(pin)
                }
                onClick={() =>
                  action.run(() =>
                    api.request("research.sharing.enable", {
                      params,
                      body: { pin },
                    }),
                  )
                }
              >
                Turn on sharing
              </ActionButton>
            </div>
          </>
        )}
      </div>
      <Modal
        open={confirmOff}
        onOpenChange={setConfirmOff}
        title="Turn off sharing?"
        description={`Every active link (${activeLinkCount}) stops working immediately. Designs are kept.`}
        footer={
          <ActionButton
            primary
            disabled={action.busy}
            onClick={async () => {
              if (
                await action.run(() =>
                  api.request("research.sharing.disable", { params, body: {} }),
                )
              )
                setConfirmOff(false);
            }}
          >
            Turn off and revoke links
          </ActionButton>
        }
      >
        <p>
          Recipients who open a revoked link see only that it is not available.
        </p>
      </Modal>
    </Panel>
  );
}

function DesignEditor({
  portfolio,
  design,
  onDone,
}: {
  portfolio: ResearchDetail;
  design?: ResearchDashboardDesign;
  onDone: () => void;
}) {
  const api = useCapiro();
  const action = useAction(onDone);
  const params = { id: portfolio.id };
  const [previewClient, setPreviewClient] = useState(
    portfolio.clientLinks[0]?.clientId ?? "",
  );
  const analytics = useCapiroQuery("research.analytics", { params });
  const fit = useCapiroQuery("research.fit", { params });
  const changes = useCapiroQuery("research.changes", {
    params,
    query: { limit: 25 },
  });
  const preview = analytics.data
    ? buildPreviewDashboard(
        {
          portfolio,
          clientId: previewClient,
          branding: true,
          analytics: analytics.data,
          fit: fit.data,
          changes: changes.data?.items,
        },
        design?.layout ?? defaultLayout(),
      )
    : undefined;
  return (
    <div className={styles.stack}>
      {portfolio.clientLinks.length > 1 && (
        <div className={styles.inline}>
          <span className={styles.hint}>Preview as</span>
          <SelectInput
            aria-label="Preview as client"
            value={previewClient}
            onValueChange={setPreviewClient}
            options={portfolio.clientLinks.map((c) => ({
              value: c.clientId,
              label: c.clientName,
            }))}
          />
        </div>
      )}
      <DashboardDesigner
        initialName={design?.name ?? ""}
        initialLayout={design?.layout ?? defaultLayout()}
        preview={preview}
        busy={action.busy}
        error={action.error}
        onCancel={onDone}
        onSave={(name, layout: ResearchDashboardLayout) =>
          action.run(() =>
            design
              ? api.request("research.designs.update", {
                  params: { id: portfolio.id, designId: design.id },
                  body: { name, layout, expectedVersion: design.version },
                })
              : api.request("research.designs.create", {
                  params,
                  body: { name, layout },
                }),
          )
        }
      />
    </div>
  );
}

function linkTone(status: ResearchShareLink["status"]) {
  return status === "active"
    ? "success"
    : status === "revoked"
      ? "danger"
      : "neutral";
}

function ShareLinks({
  portfolio,
  enabled,
  tenantEnabled,
  designs,
  links,
  onChanged,
}: {
  portfolio: ResearchDetail;
  enabled: boolean;
  tenantEnabled: boolean;
  designs: readonly ResearchDashboardDesign[];
  links: ReturnType<typeof useCapiroQuery<"research.shareLinks">>;
  onChanged: () => void;
}) {
  const api = useCapiro();
  const params = { id: portfolio.id };
  const snapshots = useCapiroQuery("research.snapshots", { params });
  const [open, setOpen] = useState(false);
  const revoke = useAction(onChanged);
  const canPublish =
    enabled &&
    tenantEnabled &&
    portfolio.myRole !== "viewer" &&
    designs.length > 0 &&
    (snapshots.data?.length ?? 0) > 0 &&
    portfolio.clientLinks.length > 0;
  const blocker = !tenantEnabled
    ? "Client sharing must be on for the workspace before you can publish."
    : !enabled
      ? "Turn on sharing first."
      : !designs.length
        ? "Create a dashboard design first."
        : snapshots.data && !snapshots.data.length
          ? "Capture a snapshot first; links are frozen at a snapshot."
          : !portfolio.clientLinks.length
            ? "Link a client to this portfolio first."
            : undefined;
  return (
    <Panel
      title="Client links"
      description="Each link opens one client's frozen dashboard for one week, behind the portfolio PIN."
      actions={
        portfolio.myRole !== "viewer" && (
          <ActionButton
            primary
            disabled={!canPublish}
            onClick={() => setOpen(true)}
          >
            Publish link
          </ActionButton>
        )
      }
    >
      {blocker && portfolio.myRole !== "viewer" && (
        <p className={styles.hint}>{blocker}</p>
      )}
      {revoke.error && <p role="alert">{revoke.error}</p>}
      <StatusPanel
        loading={links.loading}
        error={links.error}
        onRetry={links.reload}
      >
        <DataTable
          rows={links.data ?? []}
          rowKey={(l) => l.id}
          caption="Published client links"
          emptyMessage="No links published yet."
          columns={[
            { key: "client", label: "Client", render: (l) => l.clientName },
            {
              key: "snapshot",
              label: "Snapshot",
              render: (l) => l.snapshotName,
            },
            {
              key: "design",
              label: "Design",
              render: (l) =>
                `${designs.find((d) => d.id === l.designId)?.name ?? "Deleted design"} v${l.designVersion}`,
            },
            {
              key: "status",
              label: "Status",
              render: (l) => (
                <Badge tone={linkTone(l.status)}>{l.status}</Badge>
              ),
            },
            {
              key: "published",
              label: "Published",
              render: (l) => when(l.publishedAt),
            },
            {
              key: "expires",
              label: "Expires",
              render: (l) => when(l.expiresAt),
            },
            {
              key: "opens",
              label: "Opens",
              render: (l) =>
                `${l.openCount}${l.lastOpenedAt ? ` · last ${when(l.lastOpenedAt)}` : ""}`,
            },
            {
              key: "pinFailures",
              label: "Wrong PINs",
              render: (l) => <SharePinAttempts link={l} />,
            },
            {
              key: "actions",
              label: "Actions",
              render: (l) =>
                l.status === "active" && portfolio.myRole !== "viewer" ? (
                  <ActionButton
                    disabled={revoke.busy}
                    onClick={() =>
                      revoke.run(() =>
                        api.request("research.shareLinks.revoke", {
                          params: { id: portfolio.id, linkId: l.id },
                          body: {},
                        }),
                      )
                    }
                  >
                    Revoke
                  </ActionButton>
                ) : null,
            },
          ]}
        />
      </StatusPanel>
      {open && (
        <PublishShareDialog
          portfolio={portfolio}
          designs={designs}
          snapshots={snapshots.data ?? []}
          canPublish={canPublish}
          onChanged={onChanged}
          onClose={() => setOpen(false)}
        />
      )}
    </Panel>
  );
}
