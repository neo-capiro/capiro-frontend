"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@capiro/ui/dropdown-menu";
import type { OutreachTemplate } from "../../../../shared/capiro/operations/outreach-template-schemas";
import { ActionButton } from "../../../../shared/module-ui";
import styles from "../workspace.module.css";

export function TemplateCard({
  template,
  writesBlocked = false,
  onAction,
}: {
  template: OutreachTemplate;
  writesBlocked?: boolean;
  onAction: (
    action:
      | "use"
      | "history"
      | "settings"
      | "duplicate"
      | "publish"
      | "archive",
    template: OutreachTemplate,
  ) => void;
}) {
  return (
    <article className={styles.templateCard}>
      <header>
        <span>{template.scope === "private" ? "Only me" : template.scope}</span>
        <span>
          {template.publishedVersionNumber
            ? `v${template.publishedVersionNumber}`
            : "Draft"}{" "}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={`Actions for ${template.name}`}
                className={styles.link}
              >
                ⋯
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {[
                ["settings", "Edit settings", template.capabilities.canInspect],
                [
                  "history",
                  "Version history",
                  template.capabilities.canInspect,
                ],
                ["duplicate", "Duplicate", template.capabilities.canDuplicate],
                ["publish", "Publish draft", template.capabilities.canPublish],
                ["archive", "Archive", template.capabilities.canArchive],
              ].map(([action, label, enabled]) => (
                <DropdownMenuItem
                  key={String(action)}
                  disabled={
                    !enabled ||
                    (writesBlocked &&
                      ["duplicate", "publish", "archive"].includes(
                        String(action),
                      ))
                  }
                  onSelect={() =>
                    onAction(
                      action as
                        | "settings"
                        | "history"
                        | "duplicate"
                        | "publish"
                        | "archive",
                      template,
                    )
                  }
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </header>
      <h3>{template.name}</h3>
      <p>
        {template.description ?? "Reusable campaign settings and guidance."}
      </p>
      <div className={styles.templateSummary}>
        <span>Type</span>
        <span>{template.campaignType ?? "Not specified"}</span>
      </div>
      <div className={styles.templateSummary}>
        <span>Used</span>
        <span>
          {template.usageCount}× ·{" "}
          {template.lastUsedAt
            ? new Date(template.lastUsedAt).toLocaleDateString()
            : "Never"}
        </span>
      </div>
      <footer>
        <ActionButton
          primary
          disabled={!template.capabilities.canUse}
          title={
            !template.capabilities.canUse
              ? "Publish a version before it can be used."
              : undefined
          }
          onClick={() => onAction("use", template)}
        >
          {template.capabilities.canUse ? "Use template" : "Publish before use"}
        </ActionButton>
      </footer>
    </article>
  );
}
