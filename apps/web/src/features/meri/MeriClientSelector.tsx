"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useClients } from "../../shared/portfolio/api/clients";
import { useSelectedClient } from "../../shared/session/SelectedClient";
import { scopedHref } from "../../shared/session/client-route";
import { DesignIcon } from "../../shared/shell/DesignIcon";
import styles from "./MeriClientSelector.module.css";

type ClientScope = { tenantId: string; userId: string };

/** The roster supplies navigation choices; Core verifies the selected client again. */
export function MeriClientSelector({
  scope,
  destination = "/meri",
}: {
  scope?: ClientScope;
  destination?: "/meri" | "/meri/conversations";
}) {
  const selected = useSelectedClient();
  const params = useSearchParams();
  const general = params.get("scope") === "general" && !params.has("clientId");
  const clients = useClients({
    enabled: Boolean(scope),
    scope: scope ?? { tenantId: "", userId: "" },
  });
  const ready = Boolean(
    scope && clients.isSuccess && !clients.isFetching && !clients.error,
  );
  const options = ready
    ? (clients.data ?? []).filter((client) => client.status !== "archived")
    : [];
  const selectedId =
    selected.state === "authorized-client" ? selected.client.id : undefined;

  return (
    <details className={styles.selector}>
      <summary className={styles.trigger}>
        <DesignIcon name="chevron" />
        <span>
          {general
            ? "General"
            : selected.state === "authorized-client"
              ? selected.client.name
              : "Choose scope"}
        </span>
      </summary>
      <div className={styles.menu}>
        <p className={styles.heading}>Chat scope</p>
        {scope && (
          <Link
            href={`${destination}?scope=general`}
            className={styles.option}
            aria-current={general ? "page" : undefined}
          >
            General
          </Link>
        )}
        {!scope ? (
          <p role="status">Verify your account to see available clients.</p>
        ) : clients.isFetching || clients.isPending ? (
          <p role="status">Loading available clients.</p>
        ) : clients.error ? (
          <div role="alert">
            <p>Available clients could not be loaded.</p>
            <button type="button" onClick={() => void clients.refetch()}>
              Retry clients
            </button>
          </div>
        ) : options.length === 0 ? (
          <p role="status">
            No available clients were returned for your account.
          </p>
        ) : (
          <nav aria-label="Choose Meri client" className={styles.options}>
            {options.map((client) => (
              <Link
                key={client.id}
                href={scopedHref(destination, client.id)}
                className={styles.option}
                aria-current={client.id === selectedId ? "page" : undefined}
              >
                {client.name.trim() || "Unnamed client"}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </details>
  );
}
