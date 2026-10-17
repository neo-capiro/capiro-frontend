"use client";

import type { ReactNode } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { ActionButton, StatusPanel } from "../../../shared/module-ui";
import styles from "./personnel-profile.module.css";

function externalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname &&
      !url.username &&
      !url.password
    )
      return url.href;
  } catch {
    // An invalid or relative URL is displayed as unavailable, never opened.
  }
  return null;
}

function observedDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Not provided"
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.card}>
      <h2>{title}</h2>
      <dl>{children}</dl>
    </section>
  );
}

function Text({ value }: { value: string | null }) {
  return <>{value?.trim() || "Not provided"}</>;
}

export function PersonnelProfile({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const query = useCapiroQuery("directory.personnelDetail", { params: { id } });
  const detail = query.data?.id === id ? query.data : null;
  const mismatch = query.data && !detail;
  const profileUrl = externalUrl(detail?.publicProfileUrl ?? null);
  const initials = detail?.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const subtitle = [detail?.title || detail?.role, detail?.organization]
    .filter(Boolean)
    .join(" · ");
  const programElements = detail
    ? [detail.pePrimary, ...detail.peSecondary].filter(Boolean).join(", ")
    : "";

  return (
    <div className={styles.profile}>
      <div className={styles.breadcrumb}>
        <ActionButton onClick={onBack}>
          <span aria-hidden="true">&larr;</span> Directory
        </ActionButton>
        <span>Modules / Directory / Department of War directory</span>
      </div>
      <StatusPanel
        loading={query.loading}
        error={
          mismatch
            ? "The selected directory record did not match the returned profile."
            : query.error
        }
        onRetry={query.reload}
      >
        {detail && (
          <>
            <header className={styles.identity}>
              <div className={styles.initials} aria-hidden="true">
                {initials}
              </div>
              <div>
                <p className={styles.eyebrow}>Department of War directory</p>
                <h1>{detail.fullName}</h1>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
              </div>
            </header>
            <div className={styles.columns}>
              <div className={styles.stack}>
                <Card title="Role & organization">
                  <Field label="Role">
                    <Text value={detail.role || detail.title} />
                  </Field>
                  <Field label="Service / organization">
                    {[detail.organization, detail.service]
                      .filter(Boolean)
                      .join(" · ") || "Not provided"}
                  </Field>
                  {detail.parentOffice && (
                    <Field label="Parent office">{detail.parentOffice}</Field>
                  )}
                  {detail.department && (
                    <Field label="Department">{detail.department}</Field>
                  )}
                  {detail.programOfRecord && (
                    <Field label="Program of record">
                      {detail.programOfRecord}
                    </Field>
                  )}
                  <Field label="Program element references">
                    {programElements || "Not provided"}
                  </Field>
                  <Field label="Source confidence score">
                    {detail.confidence}
                  </Field>
                </Card>
                <Card title="Public contact & links">
                  <Field label="Public profile">
                    {profileUrl ? (
                      <a
                        href={profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {profileUrl}
                      </a>
                    ) : (
                      "Not provided"
                    )}
                  </Field>
                  <Field label="Email domain">
                    <Text value={detail.emailDomain} />
                  </Field>
                  <Field label="Email">
                    <Text value={detail.email} />
                  </Field>
                  <Field label="Phone">
                    <Text value={detail.phone} />
                  </Field>
                </Card>
                <aside className={styles.notice}>
                  <strong>Evidence context</strong>
                  <p>
                    Source observation dates describe directory evidence, not
                    employment tenure or program authority.
                  </p>
                </aside>
              </div>
              <div className={styles.stack}>
                <Card title="Source evidence">
                  <Field label="Status">{detail.status}</Field>
                  <Field label="Source count">{detail.sources.length}</Field>
                  <Field label="First seen">
                    {observedDate(detail.firstSeenAt)}
                  </Field>
                  <Field label="Last seen">
                    {observedDate(detail.lastSeenAt)}
                  </Field>
                </Card>
                <section className={styles.card}>
                  <h2>Sources</h2>
                  {detail.sources.length ? (
                    <ul className={styles.sources}>
                      {detail.sources.map((source) => {
                        const url = externalUrl(source.sourceUrl);
                        return (
                          <li key={source.id}>
                            <strong>{source.source}</strong>
                            <span>
                              Observed {observedDate(source.observedAt)}
                            </span>
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View source
                              </a>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className={styles.empty}>No source details provided.</p>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </StatusPanel>
    </div>
  );
}
