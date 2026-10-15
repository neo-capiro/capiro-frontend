import { useId } from "react";
import { FormField } from "../../ui/FormField";
import { InlineDialog } from "../../ui/InlineDialog";
import { LinkAction } from "../../ui/LinkAction";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { Notice } from "../../ui/Notice";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import type { Heading } from "./types";
import styles from "./files.module.css";

/** A navigation from the scope dialog; without a registered destination it renders disabled. */
export type ScopeAction = {
  id: string;
  label: string;
  variant: "primary" | "outline";
  href?: string;
};

/** An artifact version's combined source scope and the filing outcome it allows. */
export type SourceScopeView = {
  heading: Heading;
  title: string;
  context: string;
  /** Every contributing source scope the version retains. */
  scopes: readonly string[];
  client: string;
  destination: string;
  audience: string;
  result: string;
  notice: { title: string; detail: string };
  actions: readonly ScopeAction[];
};

/**
 * 04.08 Artifact sharing and source scopes and 04.08A Source access review requested:
 * the exact version keeps all contributing source scopes, so a broader destination is
 * blocked until a review is decided; requesting review grants no access and files nothing.
 */
export function SourceScopeScreen({
  view,
  closeHref,
  unavailable,
}: {
  view: SourceScopeView;
  closeHref?: string | undefined;
  unavailable: string;
}) {
  const scopesLabel = useId();
  return (
    <div className={`${ui.page} ${styles.screen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
      />
      <InlineDialog
        title={view.title}
        context={view.context}
        closeHref={closeHref}
        unavailable={unavailable}
      >
        <div className={styles.scopes}>
          <p id={scopesLabel} className={styles.scopeLabel}>
            Contributing source scopes
          </p>
          <ul aria-labelledby={scopesLabel}>
            {view.scopes.map((scope) => (
              <li key={scope}>
                <StatusPill>{scope}</StatusPill>
              </li>
            ))}
          </ul>
        </div>
        <FormField label="Destination client" value={view.client} />
        <FormField label="Requested destination" value={view.destination} />
        <FormField
          label="Who can open this version now"
          value={view.audience}
        />
        <FormField label="Filing result" value={view.result} />
        <div className={styles.full}>
          <Notice tone="warning" title={view.notice.title}>
            {view.notice.detail}
          </Notice>
        </div>
        <div className={ui.row}>
          {view.actions.map((action) => (
            <LinkAction
              key={action.id}
              variant={action.variant}
              href={action.href}
              unavailable={unavailable}
            >
              {action.label}
            </LinkAction>
          ))}
        </div>
      </InlineDialog>
    </div>
  );
}
