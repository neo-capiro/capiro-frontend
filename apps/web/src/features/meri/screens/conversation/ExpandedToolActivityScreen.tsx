import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { LinkAction } from "../../ui/LinkAction";
import { StateMessage } from "../../ui/StateMessage";
import ui from "../../ui/meri-ui.module.css";

export type ExpandedToolActivityView = {
  title: string;
  context: string;
  receipt: {
    title: string;
    /** Exact operation, scope, coverage and output facts, in reading order. */
    facts: readonly { label: string; value: string }[];
    limits: string;
  };
  backHref?: string;
};

/** 02.07A Expanded tool activity: the exact read and output receipt, without hidden reasoning. */
export function ExpandedToolActivityScreen({
  view,
  unavailable,
}: {
  view: ExpandedToolActivityView;
  unavailable: string;
}) {
  const { receipt } = view;
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.context} />
      <StateMessage
        title={receipt.title}
        status="Information"
        action={
          <LinkAction
            variant="outline"
            href={view.backHref}
            unavailable={unavailable}
          >
            Back to run activity
          </LinkAction>
        }
      >
        <ul aria-label="Receipt details">
          {receipt.facts.map((fact) => (
            <li key={fact.label}>
              {fact.label}: {fact.value}
            </li>
          ))}
        </ul>
        <p>{receipt.limits}</p>
      </StateMessage>
    </div>
  );
}
