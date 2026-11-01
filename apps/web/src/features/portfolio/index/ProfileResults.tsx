"use client";
import Link from "next/link";
import { useId } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  clientLocation,
  clientSectorLabel,
  initials,
  memberName,
  type Client,
  type Member,
} from "./contracts";
import { ClientMonogram } from "../client-profile/public";
import styles from "./portfolio.module.css";
export function ProfileResults({
  rows,
  view,
  owners,
}: {
  rows: Client[];
  view: "list" | "cards";
  owners?: Record<string, { accountOwner: Member | null }>;
}) {
  return view === "list" ? (
    <div className="tableWrap">
      <table aria-label="Portfolio profiles">
        <thead>
          <tr>
            <th>Organization</th>
            <th>Type</th>
            <th>Sector</th>
            <th>Account owner</th>
            <th>Status</th>
            <th>
              <span className="srOnly">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((client) => (
            <tr key={client.id}>
              <td>
                <Link className="row" href={`/portfolio/${client.id}`}>
                  <ProfileLogo client={client} />
                  <span>
                    <strong>{client.name}</strong>
                    <small className={styles.website}>
                      {client.website ?? "No website"}
                    </small>
                  </span>
                </Link>
              </td>
              <td>{client.profileType ?? "—"}</td>
              <td>{clientSectorLabel(client) ?? "—"}</td>
              <td>
                {owners?.[client.id]
                  ? memberName(owners[client.id]?.accountOwner)
                  : "Owner unavailable"}
              </td>
              <td>
                <span className="chip">{client.profileStatus}</span>
              </td>
              <td>
                <Link
                  href={`/portfolio/${client.id}`}
                  aria-label={`Open ${client.name}`}
                >
                  <ArrowUpRight size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className={styles.cards}>
      {rows.map((client) => (
        <ProfileCard
          key={client.id}
          client={client}
          ownership={owners?.[client.id]}
        />
      ))}
    </div>
  );
}
export function ProfileCard({
  client,
  ownership,
}: {
  client: Client;
  ownership?: { accountOwner: Member | null };
}) {
  const owner = ownership?.accountOwner;
  const location = clientLocation(client);
  const sector = clientSectorLabel(client);
  const descriptionId = useId();
  return (
    <article className={styles.profileCard}>
      <div className={styles.cardTop}>
        <ProfileLogo client={client} />
        <div className={styles.cardIdentity}>
          <h2>
            <Link
              className={styles.profileLink}
              href={`/portfolio/${client.id}`}
              aria-label={`Open ${client.name}`}
              aria-describedby={descriptionId}
              title={client.name}
            >
              {client.name}
            </Link>
          </h2>
          <small id={descriptionId}>
            {sector ?? "Sector not specified"}
            {location && ` · ${location}`}
          </small>
        </div>
      </div>
      <div className={styles.cardBottom}>
        <span
          className="chip"
          role="note"
          aria-label={`Profile status: ${client.profileStatus}`}
        >
          {client.profileStatus}
        </span>
        <span
          className={styles.ownerAvatar}
          role="img"
          title={ownership ? memberName(owner) : "Owner unavailable"}
          aria-label={`Account owner: ${ownership ? memberName(owner) : "unavailable"}`}
        >
          {owner ? initials(memberName(owner)) : "—"}
        </span>
      </div>
    </article>
  );
}
function ProfileLogo({ client }: { client: Client }) {
  // M1: Core returns the app-relative logo path (/api/client-logo/<id>). It is an
  // address on this origin, not a website, so it must not be forced through the
  // website sanitiser (which would rewrite it into https:///api/... and break).
  const src = client.logoUrl ?? undefined;
  return (
    <span className={styles.profileLogo} aria-hidden="true">
      <ClientMonogram name={client.name} logoUrl={src} size={40} />
    </span>
  );
}
