import { useId, type Ref } from "react";
import { FormField } from "../../ui/FormField";
import { LinkAction } from "../../ui/LinkAction";
import { Notice } from "../../ui/Notice";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import type { DownloadView } from "./types";
import styles from "./files.module.css";

/**
 * An action of the sharing view: navigation to a registered destination (disabled
 * without one), or a local overlay step: opening the permitted source bundle
 * download or closing the dialog the view is shown in.
 */
export type ScopeAction = {
  id: string;
  label: string;
  variant: "primary" | "outline";
  href?: string;
  local?: "bundle" | "close";
};

/** An artifact version's combined source scope and the filing outcome it allows. */
export type SourceScopeDetailsView = {
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
  /** The permitted source bundle of this exact version, when the view offers it. */
  bundle?: DownloadView;
};

/** Handlers for the local actions; a local action without its handler renders disabled. */
export type ScopeActionHandlers = Partial<
  Record<NonNullable<ScopeAction["local"]>, () => void>
>;

function ScopeActions({
  actions,
  handlers,
  bundleRef,
  unavailable,
}: {
  actions: readonly ScopeAction[];
  handlers: ScopeActionHandlers;
  bundleRef: Ref<HTMLButtonElement> | undefined;
  unavailable: string;
}) {
  return (
    <div className={ui.row}>
      {actions.map((action) => {
        const handler = action.local ? handlers[action.local] : undefined;
        return action.local ? (
          <button
            key={action.id}
            ref={action.local === "bundle" ? bundleRef : undefined}
            type="button"
            className={ui[action.variant]}
            aria-haspopup={action.local === "bundle" ? "dialog" : undefined}
            disabled={!handler}
            title={handler ? undefined : unavailable}
            onClick={handler}
          >
            {action.label}
          </button>
        ) : (
          <LinkAction
            key={action.id}
            variant={action.variant}
            href={action.href}
            unavailable={unavailable}
          >
            {action.label}
          </LinkAction>
        );
      })}
    </div>
  );
}

/**
 * Body of the artifact sharing view (04.08, 04.08A and the 04.08B dialog): the exact
 * version keeps all contributing source scopes, so a broader destination stays blocked
 * until a review is decided; requesting review grants no access and files nothing.
 */
export function SourceScopeDetails({
  view,
  handlers,
  bundleRef,
  unavailable,
}: {
  view: SourceScopeDetailsView;
  handlers: ScopeActionHandlers;
  /** Receives the bundle download control, where the bundle dialog returns focus. */
  bundleRef?: Ref<HTMLButtonElement>;
  unavailable: string;
}) {
  const scopesLabel = useId();
  return (
    <>
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
      <FormField label="Who can open this version now" value={view.audience} />
      <FormField label="Filing result" value={view.result} />
      <div className={styles.full}>
        <Notice tone="warning" title={view.notice.title}>
          {view.notice.detail}
        </Notice>
      </div>
      <ScopeActions
        actions={view.actions}
        handlers={handlers}
        bundleRef={bundleRef}
        unavailable={unavailable}
      />
    </>
  );
}
