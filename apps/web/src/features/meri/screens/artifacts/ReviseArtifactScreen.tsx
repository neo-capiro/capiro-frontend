"use client";
import { useEffect, useRef, useState } from "react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import ui from "../../ui/meri-ui.module.css";
import { DetailList } from "./DetailList";
import {
  RevisionRequestForm,
  type RevisionRequestDefaults,
} from "./RevisionRequestForm";
import type { DetailItem, Heading } from "./types";
import shared from "./artifacts.module.css";
import styles from "./versions.module.css";

export type ReviseArtifactView = RevisionRequestDefaults & {
  heading: Heading;
  process: readonly DetailItem[];
};

/** 03.10 Revise an artifact: revision request beside the verification steps it will run. */
export function ReviseArtifactScreen({
  view,
  unavailable,
}: {
  view: ReviseArtifactView;
  unavailable: string;
}) {
  const [open, setOpenState] = useState(true);
  const toggled = useRef(false);
  const requestField = useRef<HTMLInputElement>(null);
  const reopenButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (toggled.current) (open ? requestField : reopenButton).current?.focus();
  }, [open]);
  const setOpen = (value: boolean) => {
    toggled.current = true;
    setOpenState(value);
  };
  return (
    <div className={`${ui.page} ${shared.screen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
      />
      <div className={styles.reviseColumn}>
        <RevisionRequestForm
          view={view}
          hidden={!open}
          onClose={() => setOpen(false)}
          requestRef={requestField}
          unavailable={unavailable}
        />
        <section
          className={`${shared.panel} ${styles.processPanel}`}
          hidden={open}
          aria-label="Revision request closed"
        >
          <p className={shared.body} role="status">
            {open
              ? ""
              : "The revision request was closed. Nothing was sent and no version was created."}
          </p>
          <button
            ref={reopenButton}
            type="button"
            className={ui.outline}
            onClick={() => setOpen(true)}
          >
            Reopen revision request
          </button>
        </section>
        <section
          className={`${shared.panel} ${styles.processPanel}`}
          aria-label="Revision process"
        >
          <DetailList label="Revision steps" items={view.process} />
        </section>
      </div>
    </div>
  );
}
