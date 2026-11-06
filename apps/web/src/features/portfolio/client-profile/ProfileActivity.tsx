"use client";
import { useEffect, useRef, type Ref } from "react";
import { ArrowUpRight, X } from "lucide-react";
import type { Client } from "@/features/portfolio/index/public";
import {
  ProfileBuildPanel,
  ProfileCompletenessSummary,
  ProfileFacts,
} from "@/features/portfolio/profile-build/public";
import { ClientCompleteness } from "./ClientCompleteness";
import styles from "./profile-activity.module.css";

export function ProfileActivityCard({
  clientId,
  open,
  detailsId,
  buttonRef,
  onToggle,
}: {
  clientId: string;
  open: boolean;
  detailsId: string;
  buttonRef: Ref<HTMLButtonElement>;
  onToggle: () => void;
}) {
  return (
    <section className={`card ${styles.card}`} aria-label="Profile activity">
      <button
        type="button"
        className={styles.open}
        ref={buttonRef}
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={onToggle}
      >
        <span>Profile activity</span>
        <ArrowUpRight size={16} aria-hidden="true" />
      </button>
      <ProfileCompletenessSummary subject={{ kind: "client", id: clientId }} />
    </section>
  );
}

export function ProfileActivityDetails({
  client,
  open,
  id,
  onClose,
}: {
  client: Client;
  open: boolean;
  id: string;
  onClose: () => void;
}) {
  const content = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    content.current?.focus({ preventScroll: true });
    content.current?.scrollIntoView({ block: "start" });
  }, [open]);
  return (
    <section
      id={id}
      ref={content}
      hidden={!open}
      tabIndex={-1}
      className={styles.details}
      aria-label="Profile activity details"
      onKeyDown={(event) => {
        if (
          event.key !== "Escape" ||
          event.defaultPrevented ||
          (event.target instanceof Element &&
            event.target.closest(
              '[role="dialog"], [role="listbox"], [role="menu"]',
            ))
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <header className={`row between ${styles.header}`}>
        <div>
          <h2>Profile activity</h2>
          <p className="muted">
            Profile completeness, sourced facts and research.
          </p>
        </div>
        <button
          type="button"
          className="button ghost"
          onClick={onClose}
          aria-label="Close profile activity"
        >
          <X size={16} aria-hidden="true" />
          Close
        </button>
      </header>
      <div className={`card ${styles.completeness}`}>
        <ClientCompleteness client={client} />
      </div>
      {/* Keep these owners mounted when collapsed: polling, selections and exact
          retries for uncertain review decisions belong to the current profile. */}
      <ProfileBuildPanel subject={{ kind: "client", id: client.id }} />
      <ProfileFacts subject={{ kind: "client", id: client.id }} />
    </section>
  );
}
