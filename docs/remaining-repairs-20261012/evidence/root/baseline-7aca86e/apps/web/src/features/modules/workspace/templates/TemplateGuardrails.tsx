"use client";

import type { OutreachTemplateSpec } from "../../../../shared/capiro/operations/outreach-template-schemas";
import { Field, SelectInput } from "../../../../shared/module-ui";
import styles from "../workspace.module.css";

type Guardrails = OutreachTemplateSpec["guardrails"];
const choices: { field: keyof Guardrails; label: string; options: string[] }[] =
  [
    {
      field: "sendAuthority",
      label: "Who may send",
      options: ["owner_only", "any_authorized_sender", "tenant_admin"],
    },
    {
      field: "approvalMode",
      label: "Approval mode",
      options: ["individual", "bulk_allowed"],
    },
    {
      field: "senderRequirement",
      label: "Sender requirement",
      options: ["any_authorized", "specific_role_required", "not_applicable"],
    },
    {
      field: "attachmentRequirement",
      label: "Attachment requirement",
      options: ["none", "optional", "required"],
    },
    {
      field: "editAuthority",
      label: "Who may edit",
      options: ["owner_only", "managers", "firm_admins"],
    },
    {
      field: "publishAuthority",
      label: "Who may publish",
      options: ["owner_only", "tenant_admin", "independent_reviewer"],
    },
  ];
export function TemplateGuardrails({
  guardrails,
  onChange,
}: {
  guardrails: Guardrails;
  onChange: (guardrails: Guardrails) => void;
}) {
  return (
    <div className={styles.form}>
      <div className={styles.grid}>
        {choices.map((choice) => (
          <Field
            key={choice.field}
            label={choice.label}
            htmlFor={`template-guardrail-${choice.field}`}
          >
            <SelectInput
              id={`template-guardrail-${choice.field}`}
              value={String(guardrails[choice.field])}
              onValueChange={(value) =>
                onChange({ ...guardrails, [choice.field]: value })
              }
              options={choice.options.map((value) => ({
                value,
                label: value.replaceAll("_", " "),
              }))}
            />
          </Field>
        ))}
      </div>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={guardrails.partialSendAllowed}
          onChange={(event) =>
            onChange({
              ...guardrails,
              partialSendAllowed: event.target.checked,
            })
          }
        />
        Allow sending to only some recipients
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={guardrails.followUpRequired}
          onChange={(event) =>
            onChange({ ...guardrails, followUpRequired: event.target.checked })
          }
        />
        Follow-up required
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={guardrails.variablesAutoResolveAllowed}
          onChange={(event) =>
            onChange({
              ...guardrails,
              variablesAutoResolveAllowed: event.target.checked,
            })
          }
        />
        Allow Meri to resolve eligible variables
      </label>
      <p className={styles.footnote}>
        These rules are stored with the template. Outreach’s backend continues
        to enforce send authority, recipient access and approvals.
      </p>
    </div>
  );
}
