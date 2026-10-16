"use client";
import { useId, useState } from "react";
import type { Client } from "@/features/portfolio/index/public";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { FederalActivity } from "./FederalActivity";
import { GovernmentRegistration } from "./GovernmentRegistration";
import styles from "./federal-profile.module.css";

export function GovernmentInfo(props: {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return <GovernmentProfile key={props.client.id} {...props} />;
}

function GovernmentProfile({
  client,
  open,
  onOpenChange,
}: {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [section, setSection] = useState<"identity" | "federal">("identity");
  const id = useId();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Government & federal profile"
      description={`Saved identity and separately sourced federal context for ${client.name}.`}
      className={styles.dialog}
      textClose
    >
      <nav className={styles.tabs} aria-label="Government profile sections">
        <button
          id={`${id}-identity`}
          className="button ghost"
          aria-pressed={section === "identity"}
          onClick={() => setSection("identity")}
        >
          Identity & registration
        </button>
        <button
          id={`${id}-federal`}
          className="button ghost"
          aria-pressed={section === "federal"}
          onClick={() => setSection("federal")}
        >
          Federal activity
        </button>
      </nav>
      <section className={styles.body} aria-labelledby={`${id}-${section}`}>
        {section === "identity" ? (
          <GovernmentRegistration client={client} />
        ) : (
          <FederalActivity clientId={client.id} enabled={open} />
        )}
      </section>
      <footer className="row between">
        <small className="muted">
          Source availability and client attribution are shown separately.
        </small>
        <button className="button primary" onClick={() => onOpenChange(false)}>
          Done
        </button>
      </footer>
    </Dialog>
  );
}
