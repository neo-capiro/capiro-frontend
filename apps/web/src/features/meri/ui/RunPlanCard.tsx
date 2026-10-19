"use client";
import { ArrowUpRight, Check, Clock } from "lucide-react";
import {
  Plan,
  PlanContent,
  PlanFooter,
  PlanHeader,
  PlanTitle,
} from "@capiro/ui/plan";
import { QueueItem } from "@capiro/ui/queue";
import { DetailRow } from "./DetailRow";
import { LinkAction } from "./LinkAction";
import styles from "./run-plan.module.css";

export type PlanStep = {
  id: string;
  title: string;
  detail: string;
  done: boolean;
};

/** A run's execution plan (AI Elements Plan with Queue steps) and its "View run" link. */
export function RunPlanCard({
  title,
  steps,
  runHref,
  unavailable,
  className,
}: {
  title: string;
  steps: readonly PlanStep[];
  runHref?: string | undefined;
  unavailable: string;
  /** Placement within the caller's layout. */
  className?: string | undefined;
}) {
  return (
    <Plan defaultOpen className={`${styles.plan} ${className ?? ""}`}>
      <PlanHeader className={styles.header}>
        <PlanTitle role="heading" aria-level={2}>
          {title}
        </PlanTitle>
      </PlanHeader>
      <PlanContent className={styles.content}>
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
      </PlanContent>
      <PlanFooter className={styles.footer}>
        <LinkAction variant="ghost" href={runHref} unavailable={unavailable}>
          <ArrowUpRight aria-hidden /> View run
        </LinkAction>
      </PlanFooter>
    </Plan>
  );
}
