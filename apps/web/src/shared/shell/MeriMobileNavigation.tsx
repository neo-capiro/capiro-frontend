"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@capiro/ui/button";
import { useSelectedClient } from "../session/SelectedClient";
import { productHref, scopedHref } from "../session/client-route";
import styles from "./shell.module.css";

/** Keep the available Meri destinations reachable when the sidebar is hidden. */
export function MeriMobileNavigation() {
  const pathname = usePathname();
  const selected = useSelectedClient();
  const clientId =
    selected.state === "authorized-client" ? selected.client.id : undefined;
  const actions = pathname === "/meri/actions";
  return (
    <nav className={styles.mobileNavigation} aria-label="Meri sections">
      <Button asChild variant={actions ? "ghost" : "secondary"}>
        <Link
          href={productHref("meri", clientId)}
          aria-current={actions ? undefined : "page"}
        >
          Conversations
        </Link>
      </Button>
      <Button asChild variant={actions ? "secondary" : "ghost"}>
        <Link
          href={scopedHref("/meri/actions", clientId)}
          aria-current={actions ? "page" : undefined}
        >
          Recommendation actions
        </Link>
      </Button>
    </nav>
  );
}
