"use client";
import { Clock, MessageSquare, Sparkles } from "lucide-react";
import { QueueItem } from "@capiro/ui/queue";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { LinkAction } from "../../ui/LinkAction";
import { DetailRow } from "../../ui/DetailRow";
import { RunPlanCard, type PlanStep } from "../../ui/RunPlanCard";
import { StatTiles, type StatTile } from "../../ui/StatTiles";
import { StopRunControl } from "./StopRunControl";
import ui from "../../ui/meri-ui.module.css";
import phone from "../../ui/phone-page.module.css";
import surfaces from "../../ui/surfaces.module.css";
import styles from "./runs.module.css";

/** One timestamped entry of the run's activity timeline. */
export type RunEvent = { id: string; title: string; detail: string };
export type RunDetailView = {
  title: string;
  context: string;
  /** Status, checkpoint and usage values come from the projected public run events. */
  metrics: readonly StatTile[];
  plan: { title: string; steps: readonly PlanStep[] };
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
    <div className={`${ui.page} ${phone.page} ${styles.detail}`}>
      <MeriPageHeading title={view.title} description={view.context} />
      <StatTiles label="Run summary" tiles={view.metrics} variant="metric" />
      <div className={styles.body}>
        <RunPlanCard
          title={view.plan.title}
          steps={view.plan.steps}
          unavailable={unavailable}
        />
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
