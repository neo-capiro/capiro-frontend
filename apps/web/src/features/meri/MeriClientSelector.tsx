"use client";

import Link from "next/link";
import { useClients } from "../portfolio/index/public";
import { useSelectedClient } from "../../shared/session/SelectedClient";
import { productHref } from "../../shared/session/client-route";
import { DesignIcon } from "../../shared/shell/DesignIcon";
import styles from "./MeriClientSelector.module.css";

type ClientScope = { tenantId: string; userId: string };

/** The roster supplies navigation choices; Core verifies the selected client again. */
export function MeriClientSelector({ scope }: { scope?: ClientScope }) {
  const selected = useSelectedClient();
  const clients = useClients({
    enabled: Boolean(scope),
    scope: scope ?? { tenantId: "", userId: "" },
  });
  const ready = Boolean(
    scope && clients.isSuccess && !clients.isFetching && !clients.error,
  );
  const options = ready
    ? (clients.data ?? []).filter(
        (client) => client.status.toLowerCase() !== "archived",
      )
    : [];
  const selectedId =
    selected.state === "authorized-client" ? selected.client.id : undefined;

  return (
    <details className={styles.selector}>
      <summary className={styles.trigger}>
        <DesignIcon name="chevron" />
        <span>
          {selected.state === "authorized-client"
            ? selected.client.name
            : "Choose client"}
        </span>
      </summary>
      <div className={styles.menu}>
        <p className={styles.heading}>Choose a client</p>
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
                href={productHref("meri", client.id)}
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
