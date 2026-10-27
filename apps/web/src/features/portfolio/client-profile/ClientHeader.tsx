"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { clientViews } from "@/shared/portfolio/shell/client-views";
import {
  type Client,
  clientLocation,
  clientSectorLabel,
} from "@/features/portfolio/index/public";
import { ClientMonogram } from "./ClientMonogram";
import { ClientViewSwitcher } from "./ClientViewSwitcher";
import { ClientProfileActions } from "./ClientProfileActions";
import { ClientMeriActions } from "./ClientMeriActions";
import styles from "./client-header.module.css";
const asset = (name: string) => `/design/411-55991-${name}.svg`;
export function ClientHeader({ client }: { client: Client }) {
  const path = usePathname();
  const base = `/portfolio/${client.id}`;
  const view =
    clientViews.find((item) => path === `${base}${item.suffix}`) ??
    clientViews[0];
  const location = clientLocation(client);
  return (
    <div
      className={`${styles.frame} ${view.suffix ? "" : styles.overviewFrame}`}
    >
      <header className={styles.header}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/portfolio" aria-label="Back to Portfolio">
            <img src={asset("imgIconArrowLeft")} alt="" />
          </Link>
          <Link href="/portfolio" className="muted">
            Portfolio
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={base} className={styles.clientName} title={client.name}>
            {client.name}
          </Link>
          <span aria-hidden="true">/</span>
          <ClientViewSwitcher
            key={client.id}
            base={base}
            name={client.name}
            view={view}
          />
        </nav>
        <div className={styles.actions}>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="button" aria-label="Quick add">
              <img src={asset("imgIconPlus")} alt="" />
              <span>Quick add</span>
              <img src={asset("imgChevron")} alt="" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className={styles.menu} align="end">
                {[
                  ["New objective", "/objectives?new=1"],
                  ["New meeting", "/calendar?new=meeting"],
                  ["Log activity", "?log=1"],
                  ["Account notes", "?notes=1"],
                ].map(([label, suffix]) => (
                  <DropdownMenu.Item key={label} asChild>
                    <Link href={`${base}${suffix}`}>{label}</Link>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          <ClientMeriActions client={client} />
          <ClientProfileActions client={client} />
        </div>
      </header>
      {view.suffix && (
        <section className={styles.strip} aria-label="Client identity">
          <span className={styles.avatar}>
            <ClientMonogram
              name={client.name}
              logoUrl={client.logoUrl}
              size={40}
            />
          </span>
          <div className={styles.identity}>
            <strong>{client.name}</strong>
            <p className="muted">
              {clientSectorLabel(client) ?? "Sector not specified"}
              {location && ` · ${location}`}
            </p>
          </div>
          <span className="chip">
            {client.profileStatus.toLowerCase().replaceAll("_", " ")} client
          </span>
        </section>
      )}
    </div>
  );
}
