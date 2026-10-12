"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type {
  OutreachTemplateDetail,
  OutreachTemplateUseReceipt,
} from "../../../../shared/capiro/operations/outreach-template-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Field,
  Modal,
  SelectInput,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import { TemplateSettings } from "./TemplateSettings";

function ApplicationReceipt({
  receipt,
}: {
  receipt: OutreachTemplateUseReceipt;
}) {
  return (
    <div className={styles.form}>
      <p className={styles.success}>
        Template applied · Version {receipt.receipt.templateVersionNumber}
      </p>
      {(["inherited", "refreshed", "unresolved", "unavailable"] as const).map(
        (section) => (
          <section key={section}>
            <h3>{section[0]!.toUpperCase() + section.slice(1)}</h3>
            {receipt.receipt[section].map((item, index) => (
              <p key={`${item.field}:${index}`}>
                <strong>{item.label}</strong>
                <span className={styles.secondary}>{item.detail}</span>
              </p>
            ))}
            {!receipt.receipt[section].length && (
              <p className={styles.footnote}>None</p>
            )}
          </section>
        ),
      )}
      <p>Recipients and live evidence must be reviewed in Outreach.</p>
      <Link
        href={`/modules/engagement?session=${encodeURIComponent(receipt.sessionId)}`}
      >
        Open Outreach draft →
      </Link>
    </div>
  );
}

function UseTemplate({ detail }: { detail: OutreachTemplateDetail }) {
  const version = detail.versions.find(
    (value) => value.id === detail.template.publishedVersionId,
  );
  const clients = useCapiroQuery("workspace.clients", {});
  const [clientId, setClientId] = useState(detail.template.clientId ?? "");
  const [title, setTitle] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const requestKey = useRef(crypto.randomUUID());
  const apply = useCapiroMutation("workspace.template.use");
  async function use() {
    try {
      await apply.run({
        params: { templateId: detail.template.id },
        body: {
          requestKey: requestKey.current,
          title: title || undefined,
          clientId: clientId || undefined,
          variableValues: values,
        },
      });
    } catch {
      /* Keep the same idempotency key across acknowledgement loss. */
    }
  }
  if (apply.data) return <ApplicationReceipt receipt={apply.data} />;
  return (
    <div className={styles.form}>
      <Field label="Client" htmlFor="template-use-client">
        <SelectInput
          id="template-use-client"
          value={clientId}
          onValueChange={setClientId}
          options={[
            { value: "", label: "Select client (optional)" },
            ...(clients.data?.items ?? []).map((client) => ({
              value: client.id,
              label: client.name,
            })),
          ]}
        />
      </Field>
      <Field label="Campaign title" htmlFor="template-use-title">
        <TextInput
          id="template-use-title"
          value={title}
          maxLength={240}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      {version?.spec.variables.map((variable) => (
        <Field
          key={variable.key}
          label={`${variable.label}${variable.required ? " *" : ""}`}
          htmlFor={`template-answer-${variable.key}`}
          description={variable.question ?? undefined}
        >
          {variable.type === "choice" ? (
            <SelectInput
              id={`template-answer-${variable.key}`}
              value={values[variable.key] ?? variable.defaultValue ?? ""}
              onValueChange={(value) =>
                setValues((previous) => ({
                  ...previous,
                  [variable.key]: value,
                }))
              }
              options={[
                { value: "", label: "Choose an answer" },
                ...(variable.choices ?? []).map((value) => ({
                  value,
                  label: value,
                })),
              ]}
            />
          ) : (
            <TextInput
              id={`template-answer-${variable.key}`}
              type={
                variable.type === "date"
                  ? "date"
                  : variable.type === "number"
                    ? "number"
                    : variable.type === "email"
                      ? "email"
                      : variable.type === "url"
                        ? "url"
                        : "text"
              }
              value={values[variable.key] ?? variable.defaultValue ?? ""}
              maxLength={500}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  [variable.key]: event.target.value,
                }))
              }
            />
          )}
        </Field>
      ))}
      {apply.error && (
        <p role="alert" className={styles.error}>
          {apply.error.message}
        </p>
      )}
      <ActionButton
        primary
        disabled={
          !detail.capabilities.canUse ||
          apply.pending ||
          !version ||
          version.spec.variables.some(
            (variable) =>
              variable.required &&
              !(values[variable.key] ?? variable.defaultValue)?.trim(),
          )
        }
        onClick={use}
      >
        {apply.pending ? "Applying…" : "Apply template"}
      </ActionButton>
    </div>
  );
}

export function TemplateDetails({
  id,
  mode,
  onClose,
  onEdit,
}: {
  id: string;
  mode: "use" | "history" | "settings";
  onClose: () => void;
  onEdit: (detail: OutreachTemplateDetail) => void;
}) {
  const query = useCapiroQuery("workspace.template", {
    params: { templateId: id },
  });
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        mode === "use"
          ? "Use template · Questions"
          : mode === "history"
            ? "Template version history"
            : "Template settings"
      }
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <div className={styles.form}>
            <h3>{query.data.template.name}</h3>
            {mode === "use" ? (
              <UseTemplate detail={query.data} />
            ) : mode === "settings" ? (
              <TemplateSettings detail={query.data} onSaved={query.reload} />
            ) : (
              <>
                <p>{query.data.template.description}</p>
                <Badge>{query.data.template.scope}</Badge>
                <DataTable
                  rows={query.data.versions}
                  rowKey={(version) => version.id}
                  caption="Template version history"
                  columns={[
                    {
                      key: "version",
                      label: "VERSION",
                      render: (version) => `v${version.versionNumber}`,
                    },
                    {
                      key: "status",
                      label: "STATE",
                      render: (version) => version.lifecycle,
                    },
                    {
                      key: "created",
                      label: "CREATED",
                      render: (version) =>
                        new Date(version.createdAt).toLocaleString(),
                    },
                    {
                      key: "hash",
                      label: "PIN",
                      render: (version) => version.contentHash.slice(0, 12),
                    },
                  ]}
                />
                {query.data.capabilities.canEdit && (
                  <ActionButton
                    onClick={() => {
                      onEdit(query.data!);
                      onClose();
                    }}
                  >
                    Edit template
                  </ActionButton>
                )}
              </>
            )}
          </div>
        )}
      </StatusPanel>
    </Modal>
  );
}
