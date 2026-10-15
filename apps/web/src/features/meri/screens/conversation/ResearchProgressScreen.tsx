"use client";
import { useRef, useState } from "react";
import { ArrowUpRight, Check, Clock, Users } from "lucide-react";
import {
  Plan,
  PlanContent,
  PlanFooter,
  PlanHeader,
  PlanTitle,
} from "@capiro/ui/plan";
import { QueueItem } from "@capiro/ui/queue";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { LinkAction } from "../../ui/LinkAction";
import { StatusPill, type StatusTone } from "../../ui/StatusPill";
import { MeriComposer } from "../../MeriComposer";
import { DetailRow } from "./DetailRow";
import { UserMessage } from "./UserMessage";
import ui from "../../ui/meri-ui.module.css";
import styles from "./run-progress.module.css";

type PlanStep = {
  id: string;
  title: string;
  detail: string;
  done: boolean;
};
export type ResearchProgressView = {
  title: string;
  context: string;
  request: string;
  plan: { title: string; steps: readonly PlanStep[] };
  /** Run state label projected from accepted public run events. */
  status: { label: string; tone: StatusTone };
  specialists: { title: string; detail: string; href?: string };
  sources: { title: string; breakdown: string; note: string };
  steer: string;
  backgroundHref?: string;
};

/** 02.01 Research in progress: plan, run overview and a steering draft while work continues. */
export function ResearchProgressScreen({
  view,
  unavailable,
}: {
  view: ResearchProgressView;
  unavailable: string;
}) {
  const [draft, setDraft] = useState(view.steer);
  const textarea = useRef<HTMLTextAreaElement>(null);
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.context} />
      <UserMessage>{view.request}</UserMessage>
      <div className={styles.workspace}>
        <Plan defaultOpen className={styles.plan}>
          <PlanHeader className={styles.planHeader}>
            <PlanTitle role="heading" aria-level={2}>
              {view.plan.title}
            </PlanTitle>
          </PlanHeader>
          <PlanContent className={styles.planContent}>
            <ul className={styles.steps} aria-label="Plan steps">
              {view.plan.steps.map((step) => (
                <QueueItem key={step.id} className={styles.step}>
                  <DetailRow
                    icon={step.done ? <Check /> : <Clock />}
                    state={step.done ? "Done" : "Not done"}
                    title={step.title}
                    detail={step.detail}
                  />
                </QueueItem>
              ))}
            </ul>
          </PlanContent>
          <PlanFooter className={styles.planFooter}>
            <LinkAction variant="ghost" unavailable={unavailable}>
              <ArrowUpRight aria-hidden /> View run
            </LinkAction>
          </PlanFooter>
        </Plan>
        <RunOverview view={view} unavailable={unavailable} />
      </div>
      <MeriComposer
        draft={draft}
        onDraft={setDraft}
        textareaRef={textarea}
        running
      />
    </div>
  );
}

function RunOverview({
  view,
  unavailable,
}: {
  view: ResearchProgressView;
  unavailable: string;
}) {
  return (
    <section className={styles.overview} aria-label="Run overview">
      <StatusPill tone={view.status.tone}>{view.status.label}</StatusPill>
      <DetailRow
        icon={<Users />}
        title={view.specialists.title}
        detail={view.specialists.detail}
      />
      <section className={styles.card} aria-label={view.sources.title}>
        <h2 className={styles.cardTitle}>{view.sources.title}</h2>
        <p className={styles.caption}>{view.sources.breakdown}</p>
        <p className={styles.small}>{view.sources.note}</p>
        <LinkAction variant="ghost" unavailable={unavailable}>
          <ArrowUpRight aria-hidden /> View evidence
        </LinkAction>
      </section>
      <LinkAction
        variant="outline"
        href={view.specialists.href}
        unavailable={unavailable}
      >
        <Users aria-hidden /> View specialists
      </LinkAction>
      <LinkAction
        variant="outline"
        href={view.backgroundHref}
        unavailable={unavailable}
      >
        <Clock aria-hidden /> Continue in background
      </LinkAction>
    </section>
  );
}
