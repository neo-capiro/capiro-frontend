import { Plus, Users } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { Notice } from "../../ui/Notice";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import surfaces from "../../ui/surfaces.module.css";
import styles from "./sources.module.css";

/**
 * 05.07 Access changed and clean recovery. Revoked context is never displayed or
 * reused; recovery starts a conversation limited to current permissions.
 */
export function AccessChangedScreen({
  cleanConversationHref,
  currentAccessHref,
  unavailable,
}: {
  cleanConversationHref?: string | undefined;
  currentAccessHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Your access has changed"
        description="This previous context is no longer available to your account."
      />
      <Notice tone="danger" title="Conversation and files are blocked">
        Meri cannot display or continue work using revoked source material.
        Reconnecting does not restore that permission.
      </Notice>
      <section
        className={`${surfaces.card} ${styles.recovery}`}
        aria-labelledby="clean-recovery"
      >
        <Users aria-hidden strokeWidth={1.5} />
        <h2 id="clean-recovery" className={surfaces.statTitle}>
          Start with your current permissions
        </h2>
        <p className={surfaces.body}>
          A clean conversation will use only sources you can access now.
          Previous restricted messages, files and memory will not be copied into
          it.
        </p>
        <LinkAction
          variant="primary"
          href={cleanConversationHref}
          unavailable={unavailable}
        >
          <Plus aria-hidden /> Start a clean conversation
        </LinkAction>
        <LinkAction
          variant="outline"
          href={currentAccessHref}
          unavailable={unavailable}
        >
          View current access
        </LinkAction>
      </section>
    </div>
  );
}
