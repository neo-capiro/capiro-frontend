"use client";
import { TemplateCard } from "./TemplateCard";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@capiro/ui/dropdown-menu";

import { useState } from "react";
import type {
  OutreachTemplate,
  OutreachTemplateDetail,
} from "../../../../shared/capiro/operations/outreach-template-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
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

export function TemplateStudio({
  onClose,
  initialClientId,
}: {
  onClose: () => void;
  initialClientId?: string;
}) {
  const [scope, setScope] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"updated" | "name" | "usage" | "last_used">(
    "updated",
  );
  const [wizard, setWizard] = useState<true | OutreachTemplateDetail>();
  const [detail, setDetail] = useState<{
    id: string;
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
  const duplicate = useCapiroMutation("workspace.template.duplicate");
  const archive = useCapiroMutation("workspace.template.archive");
  const publish = useCapiroMutation("workspace.template.publish");
  const saveCampaign = useCapiroMutation("workspace.template.from-campaign");
  const pending = duplicate.pending || archive.pending || publish.pending;
  const error = duplicate.error ?? archive.error ?? publish.error;
  function action(
    kind: "use" | "history" | "settings" | "duplicate" | "archive" | "publish",
    template: OutreachTemplate,
  ) {
    if (kind === "use" || kind === "history" || kind === "settings")
      setDetail({ id: template.id, mode: kind });
    else {
      duplicate.reset();
      archive.reset();
      publish.reset();
      setConfirm({ template, action: kind });
    }
  }
  async function apply() {
    if (!confirm) return;
    const params = { templateId: confirm.template.id };
    try {
      if (confirm.action === "archive") await archive.run({ params });
      else if (confirm.action === "publish") await publish.run({ params });
      else await duplicate.run({ params, body: {} });
      setConfirm(undefined);
      list.reload();
    } catch {
      /* Each response/error is attributed to its own operation. */
    }
  }
  async function fromSession() {
    try {
      await saveCampaign.run({
        body: { sessionId, name: campaignName, scope: "private" },
      });
      setFromCampaign(false);
      list.reload();
    } catch {
      /* Preserve the campaign id and template name. */
    }
  }
  const templates = (list.data ?? []).filter((template) =>
    scope === "all" || scope === "mine" || scope === "archived"
      ? scope === "archived"
        ? template.status === "archived"
        : template.status === "active"
      : template.scope === scope,
  );
  return (
    <section className={styles.screen} data-design-node="1064:254094">
      <PageHeader title="Workspace" />
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
          <ActionButton primary onClick={() => setWizard(true)}>
            + Create template
          </ActionButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ActionButton aria-label="More template actions">⋯</ActionButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
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
            <ActionButton primary disabled={pending} onClick={apply}>
              {pending ? "Saving…" : "Confirm"}
            </ActionButton>
          </>
        }
      >
        <p>{confirm?.template.name}</p>
        {error && (
          <p role="alert" className={styles.error}>
            {error.message}
          </p>
        )}
      </Modal>
      <Modal
        open={fromCampaign}
        onOpenChange={setFromCampaign}
        title="Save campaign as template"
        description="Capture the reusable settings from an existing Outreach V3 campaign."
        footer={
          <>
            <ActionButton onClick={() => setFromCampaign(false)}>
              Cancel
            </ActionButton>
            <ActionButton
              primary
              disabled={
                saveCampaign.pending || !campaignName.trim() || !sessionId
              }
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
              disabled={saveCampaign.pending}
            />
          )}
          <Field label="Template name" htmlFor="template-from-session-name">
            <TextInput
              id="template-from-session-name"
              maxLength={160}
              value={campaignName}
              onChange={(event) => setCampaignName(event.target.value)}
            />
          </Field>
          {saveCampaign.error && (
            <p role="alert" className={styles.error}>
              {saveCampaign.error.message}
            </p>
          )}
        </div>
      </Modal>
    </section>
  );
}
