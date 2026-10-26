"use client";
import { TemplateCard } from "./TemplateCard";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@capiro/ui/dropdown-menu";

import { useEffect, useRef, useState } from "react";
import type {
  OutreachTemplate,
  OutreachTemplateDetail,
} from "../../../../shared/capiro/operations/outreach-template-schemas";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  PageHeader,
  SelectInput,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import { TemplateDetails } from "./TemplateDetails";
import { TemplateWizard } from "./TemplateWizard";
import { CampaignPicker } from "./CampaignPicker";
import { workspaceHref } from "../workspace-route";
import presentation from "./template-presentation.module.css";
import {
  TemplateCommandsProvider,
  useTemplateCommands,
} from "./useTemplateCommands";
import { TemplateRecoveryPanel } from "./TemplateRecoveryPanel";
import historyStyles from "./template-history.module.css";

export function TemplateStudio(props: {
  onClose: () => void;
  initialClientId?: string;
}) {
  const me = useCapiroQuery("me.read", {});
  return (
    <StatusPanel loading={me.loading} error={me.error} onRetry={me.reload}>
      {me.data && (
        <TemplateCommandsProvider
          key={JSON.stringify([
            me.data.tenant.id,
            me.data.user.id,
            me.data.user.clerkUserId,
            props.initialClientId,
          ])}
          actor={{
            tenantId: me.data.tenant.id,
            userId: me.data.user.id,
            clerkUserId: me.data.user.clerkUserId,
          }}
        >
          <TemplateStudioView {...props} />
        </TemplateCommandsProvider>
      )}
    </StatusPanel>
  );
}

function TemplateStudioView({
  onClose,
  initialClientId,
}: {
  onClose: () => void;
  initialClientId?: string;
}) {
  const commands = useTemplateCommands();
  const [scope, setScope] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"updated" | "name" | "usage" | "last_used">(
    "updated",
  );
  const [wizard, setWizard] = useState<true | OutreachTemplateDetail>();
  const [detail, setDetail] = useState<{
    id: string;
    clientId?: string;
    mode: "use" | "history" | "settings";
  }>();
  const [confirm, setConfirm] = useState<{
    template: OutreachTemplate;
    action: "duplicate" | "archive" | "publish";
  }>();
  const [sessionId, setSessionId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [fromCampaign, setFromCampaign] = useState(false);
  const list = useCapiroQuery("workspace.templates", {
    query: {
      clientId: initialClientId,
      search,
      includeArchived: scope === "archived",
      mineOnly: scope === "mine",
      sort,
    },
  });
  const refreshedMetadata = useRef("");
  const reloadList = list.reload;
  useEffect(() => {
    const record = commands.record;
    if (
      record?.metadataAcknowledged &&
      refreshedMetadata.current !== record.requestId
    ) {
      refreshedMetadata.current = record.requestId;
      reloadList();
    }
  }, [commands.record, reloadList]);
  const pending = commands.busy;
  const error = commands.error;
  function action(
    kind: "use" | "history" | "settings" | "duplicate" | "archive" | "publish",
    template: OutreachTemplate,
  ) {
    if (kind === "use" || kind === "history" || kind === "settings")
      setDetail({
        id: template.id,
        mode: kind,
        clientId: template.clientId ?? undefined,
      });
    else {
      if (commands.blocked) return;
      setConfirm({ template, action: kind });
    }
  }
  async function apply() {
    if (!confirm || commands.blocked) return;
    const params = { templateId: confirm.template.id };
    const completed =
      confirm.action === "publish"
        ? confirm.template.currentDraftVersionId &&
          (await commands.submit({
            operation: "workspace.template.publish",
            accessClientId: confirm.template.clientId ?? undefined,
            input: {
              params,
              body: {
                expectedDraftVersionId: confirm.template.currentDraftVersionId,
              },
            },
          }))
        : confirm.action === "archive"
          ? await commands.submit({
              operation: "workspace.template.archive",
              accessClientId: confirm.template.clientId ?? undefined,
              input: { params },
            })
          : await commands.submit({
              operation: "workspace.template.duplicate",
              accessClientId: confirm.template.clientId ?? undefined,
              input: {
                params,
                body: { clientId: confirm.template.clientId ?? undefined },
              },
            });
    if (completed && completed.result !== undefined) {
      setConfirm(undefined);
      list.reload();
    }
  }
  async function fromSession() {
    const completed = await commands.submit({
      operation: "workspace.template.from-campaign",
      input: { body: { sessionId, name: campaignName, scope: "private" } },
    });
    if (completed?.result !== undefined) {
      setFromCampaign(false);
      list.reload();
    }
  }
  const templates = (list.data ?? []).filter((template) =>
    scope === "all" || scope === "mine" || scope === "archived"
      ? scope === "archived"
        ? template.status === "archived"
        : template.status === "active"
      : template.scope === scope,
  );
  if (!commands.ready)
    return <TemplateRecoveryPanel onAcknowledged={list.reload} />;
  return (
    <section className={styles.screen} data-design-node="1064:254094">
      <PageHeader title="Workspace" />
      <TemplateRecoveryPanel
        onAcknowledged={() => {
          list.reload();
          setDetail(undefined);
          setWizard(undefined);
          setConfirm(undefined);
          setFromCampaign(false);
        }}
      />
      <nav className={presentation.workspaceTabs} aria-label="Workspace views">
        <button onClick={onClose}>Documents</button>
        <span aria-current="page">Template Studio</span>
        <Link
          href={workspaceHref({
            kind: "view",
            view: "shares",
            clientId: initialClientId,
          })}
        >
          Client shares
        </Link>
      </nav>
      <div className={presentation.templateType}>Outreach campaigns</div>
      <header className={presentation.heading}>
        <div className={presentation.titles}>
          <p>Templates</p>
          <h2>Start from an approved way of working</h2>
        </div>
        <div className={presentation.headActions}>
          <SelectInput
            aria-label="Sort templates"
            value={sort}
            onValueChange={(value) => setSort(value as typeof sort)}
            options={[
              { value: "updated", label: "Last updated" },
              { value: "name", label: "Name" },
              { value: "usage", label: "Most used" },
              { value: "last_used", label: "Last used" },
            ]}
          />
          <ActionButton onClick={list.reload}>Refresh</ActionButton>
          <ActionButton
            primary
            disabled={commands.blocked}
            onClick={() => setWizard(true)}
          >
            + Create template
          </ActionButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ActionButton aria-label="More template actions">⋯</ActionButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={commands.blocked}
                onSelect={() => {
                  setSessionId("");
                  setFromCampaign(true);
                }}
              >
                Save campaign as template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className={presentation.filters}>
        <div
          className={presentation.categories}
          role="group"
          aria-label="Template categories"
        >
          {[
            ["all", "All"],
            ["capiro", "Capiro"],
            ["firm", "Firm"],
            ["client", "Client"],
            ["mine", "My templates"],
            ["archived", "Archived"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={scope === value}
              onClick={() => setScope(value!)}
            >
              {label}
            </button>
          ))}
        </div>
        <TextInput
          aria-label="Search templates"
          placeholder="Search templates…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {scope === "capiro" ? (
        <div className={styles.info}>
          <h3>No Capiro templates yet</h3>
          <p>
            System campaign templates are not released by the existing Outreach
            service.
          </p>
        </div>
      ) : (
        <StatusPanel
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          empty={
            !list.loading && !list.error && !templates.length
              ? "No templates match this view"
              : undefined
          }
        >
          <div className={`${styles.templateGrid} ${presentation.cards}`}>
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                writesBlocked={commands.blocked}
                onAction={action}
              />
            ))}
          </div>
        </StatusPanel>
      )}
      {wizard && (
        <TemplateWizard
          existing={wizard === true ? undefined : wizard}
          onClose={() => setWizard(undefined)}
          onSaved={() => list.reload()}
        />
      )}
      {detail && (
        <TemplateDetails
          key={detail.id}
          id={detail.id}
          clientId={detail.clientId}
          mode={detail.mode}
          onClose={() => setDetail(undefined)}
          onEdit={setWizard}
          onSettingsSaved={list.reload}
        />
      )}
      <Modal
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirm(undefined);
        }}
        title={`${confirm?.action === "publish" ? "Publish" : confirm?.action === "archive" ? "Archive" : "Duplicate"} template?`}
        description={
          confirm?.action === "publish"
            ? "The published version is immutable. Existing campaigns retain their original template version."
            : "This action is checked by the template service."
        }
        footer={
          <>
            <ActionButton
              disabled={pending}
              onClick={() => setConfirm(undefined)}
            >
              Cancel
            </ActionButton>
            <ActionButton
              primary
              disabled={
                commands.blocked ||
                (confirm?.action === "publish" &&
                  !confirm.template.currentDraftVersionId)
              }
              onClick={apply}
            >
              {pending ? "Saving…" : "Confirm"}
            </ActionButton>
          </>
        }
      >
        <p>{confirm?.template.name}</p>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </Modal>
      <Modal
        open={fromCampaign}
        className={`${historyStyles.dialog} ${historyStyles.saveDialog}`}
        onOpenChange={(open) => {
          if (!commands.busy) setFromCampaign(open);
        }}
        title="Keep this reusable approach"
        description="Capture the reusable settings from an existing Outreach V3 campaign."
        footer={
          <>
            <ActionButton onClick={() => setFromCampaign(false)}>
              Cancel
            </ActionButton>
            <ActionButton
              primary
              disabled={commands.blocked || !campaignName.trim() || !sessionId}
              onClick={fromSession}
            >
              Save private draft
            </ActionButton>
          </>
        }
      >
        <div className={styles.form}>
          {fromCampaign && (
            <CampaignPicker
              value={sessionId}
              onChange={setSessionId}
              disabled={commands.blocked}
            />
          )}
          <Field label="Template name" htmlFor="template-from-session-name">
            <TextInput
              disabled={commands.blocked}
              id="template-from-session-name"
              maxLength={160}
              value={campaignName}
              onChange={(event) => setCampaignName(event.target.value)}
            />
          </Field>
          {commands.error && (
            <p role="alert" className={styles.error}>
              {commands.error}
            </p>
          )}
        </div>
      </Modal>
    </section>
  );
}
