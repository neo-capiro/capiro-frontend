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
  const files = pathname === "/meri/files";
  const conversations = !actions && !files;
  return (
    <nav className={styles.mobileNavigation} aria-label="Meri sections">
      <Button asChild variant={conversations ? "secondary" : "ghost"}>
        <Link
          href={productHref("meri", clientId)}
          aria-current={conversations ? "page" : undefined}
        >
          Conversations
        </Link>
      </Button>
      <Button asChild variant={files ? "secondary" : "ghost"}>
        <Link
          href={scopedHref("/meri/files", clientId)}
          aria-current={files ? "page" : undefined}
        >
          Files
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
