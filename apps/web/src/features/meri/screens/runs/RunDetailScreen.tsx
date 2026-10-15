"use client";
import {
  ArrowUpRight,
  Check,
  Clock,
  MessageSquare,
  Sparkles,
} from "lucide-react";
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
import { DetailRow } from "../conversation/DetailRow";
import { StopRunControl } from "./StopRunControl";
import ui from "../../ui/meri-ui.module.css";
import surfaces from "../../ui/surfaces.module.css";
import styles from "./runs.module.css";

export type RunMetric = {
  id: string;
  label: string;
  value: string;
  caption: string;
};
export type RunStep = {
  id: string;
  title: string;
  detail: string;
  done: boolean;
};
/** One timestamped entry of the run's activity timeline. */
export type RunEvent = { id: string; title: string; detail: string };
export type RunDetailView = {
  title: string;
  context: string;
  /** Status, checkpoint and usage values come from the projected public run events. */
  metrics: readonly RunMetric[];
  plan: { title: string; steps: readonly RunStep[] };
  activity: readonly RunEvent[];
  toolActivityHref?: string;
  steerHref?: string;
  conversationHref?: string;
};

/** 02.03 Run detail: projected status, the execution plan, recent activity and run controls. */
export function RunDetailScreen({
  view,
  unavailable,
}: {
  view: RunDetailView;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.context} />
      <ul className={styles.metrics} aria-label="Run summary">
        {view.metrics.map((metric) => (
          <li key={metric.id} className={styles.metric}>
            <span className={styles.metricLabel}>{metric.label}</span>
            <span className={styles.metricValue}>{metric.value}</span>
            <span className={surfaces.caption}>{metric.caption}</span>
          </li>
        ))}
      </ul>
      <div className={styles.body}>
        <Plan defaultOpen className={styles.plan}>
          <PlanHeader className={styles.planHeader}>
            <PlanTitle role="heading" aria-level={2}>
              {view.plan.title}
            </PlanTitle>
          </PlanHeader>
          <PlanContent>
            <PlanSteps steps={view.plan.steps} />
          </PlanContent>
          <PlanFooter className={styles.planFooter}>
            <LinkAction variant="ghost" unavailable={unavailable}>
              <ArrowUpRight aria-hidden /> View run
            </LinkAction>
          </PlanFooter>
        </Plan>
        <RunActivity
          activity={view.activity}
          toolActivityHref={view.toolActivityHref}
          unavailable={unavailable}
        />
      </div>
      <div className={ui.row} aria-label="Run controls">
        <LinkAction
          variant="outline"
          href={view.steerHref}
          unavailable={unavailable}
        >
          <Sparkles aria-hidden /> Steer this run
        </LinkAction>
        <StopRunControl
          label="Stop"
          variant="outline"
          unavailable={unavailable}
        />
        <LinkAction
          variant="primary"
          href={view.conversationHref}
          unavailable={unavailable}
        >
          <MessageSquare aria-hidden /> View conversation
        </LinkAction>
      </div>
    </div>
  );
}

function RunActivity({
  activity,
  toolActivityHref,
  unavailable,
}: {
  activity: readonly RunEvent[];
  toolActivityHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <section className={styles.activity} aria-labelledby="run-activity">
      <h2 id="run-activity" className={surfaces.sectionTitle}>
        Run activity
      </h2>
      <ul className={styles.steps} aria-label="Recent run activity">
        {activity.map((entry) => (
          <QueueItem key={entry.id} className={styles.step}>
            <DetailRow
              icon={<Clock />}
              title={entry.title}
              detail={entry.detail}
            />
          </QueueItem>
        ))}
      </ul>
      <LinkAction
        variant="outline"
        href={toolActivityHref}
        unavailable={unavailable}
      >
        Tool activity
      </LinkAction>
      <LinkAction variant="ghost" unavailable={unavailable}>
        Usage details
      </LinkAction>
    </section>
  );
}

function PlanSteps({ steps }: { steps: readonly RunStep[] }) {
  return (
    <ul className={styles.steps} aria-label="Plan steps">
      {steps.map((step) => (
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
  );
}
