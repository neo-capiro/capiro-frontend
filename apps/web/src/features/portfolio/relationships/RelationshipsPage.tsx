"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { usePeople } from "./queries";
import { titleOverlaps } from "./contracts";
import { OrganizationChart } from "./OrganizationChart";
import { ContactDrawer } from "./ContactDrawer";
import styles from "./relationships.module.css";
import type { Destinations } from "@/shared/portfolio/config/config";
import { GovernmentRelationships } from "./GovernmentRelationships";
import { RelationshipTypeNavigation } from "./RelationshipTypeNavigation";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { canManageContacts } from "./contact-api";
import { useContactCreateAttempt } from "./contact-create-attempt";
import { ContactCreateRecovery } from "./ContactCreateRecovery";
export function RelationshipsPage({
  clientId,
  destinations = {},
}: {
  clientId: string;
  destinations?: Destinations;
}) {
  const params = useSearchParams();
  return params.get("kind") === "government" ? (
    <GovernmentRelationships
      key={clientId}
      clientId={clientId}
      destinations={destinations}
    />
  ) : (
    <OrganizationRelationships key={clientId} clientId={clientId} />
  );
}
function OrganizationRelationships({ clientId }: { clientId: string }) {
  const query = usePeople(clientId);
  const identity = useIdentity();
  const creation = useContactCreateAttempt(clientId);
  const permitted =
    identity.isSuccess &&
    !identity.isFetching &&
    !identity.error &&
    canManageContacts(identity.data?.role);
  const records = query.isSuccess && !query.error ? query.data : undefined;
  const people = records ?? [];
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [readError, setReadError] = useState(query.error);
  if (readError !== query.error) {
    setReadError(query.error);
    if (query.error) {
      setReviewing(false);
      setSearch("");
    }
  }
  const selected = params.get("person");
  const person = people.find((p) => p.id === selected);
  const open = (id: string | null) => {
    if (id && (!records || query.isFetching)) return;
    const next = new URLSearchParams(params);
    if (id) next.set("person", id);
    else next.delete("person");
    router.replace(`${path}?${next}`, { scroll: false });
  };
  const searchParams = params.toString();
  useEffect(() => {
    if (!query.error) return;
    const next = new URLSearchParams(searchParams);
    if (!next.has("person")) return;
    next.delete("person");
    router.replace(`${path}?${next}`, { scroll: false });
  }, [query.error, searchParams, router, path]);
  const overlaps = new Set(titleOverlaps(people).map((p) => p.id));
  const review = people.filter(
    (p) => p.reviewRequired || overlaps.has(p.id) || !p.hierarchyLevel,
  );
  return (
    <div className="page stack">
      <header className="row between">
        <h1>Relationships</h1>
        <div className="row">
          <button
            className="button"
            disabled={!permitted || !records || query.isFetching}
            onClick={() => setReviewing(true)}
          >
            Configure hierarchy
          </button>
          <button
            className="button primary"
            disabled={
              !permitted ||
              !records ||
              query.isFetching ||
              !creation.ready ||
              creation.busy ||
              Boolean(creation.attempt)
            }
            onClick={() => {
              if (!creation.attempt) open("new");
            }}
          >
            Add contact
          </button>
        </div>
      </header>
      <RelationshipTypeNavigation />
      {permitted && <ContactCreateRecovery creation={creation} />}
      <QueryState
        error={identity.error}
        retry={() => void identity.refetch()}
      />
      {identity.isSuccess &&
        !identity.isFetching &&
        !identity.error &&
        !permitted && (
          <p role="status">Your role cannot change organization contacts.</p>
        )}
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {records && (
        <section className={styles.container}>
          <div className="toolbar">
            <input
              aria-label="Search contacts"
              placeholder="Search name or title…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <span className="muted">
              {people.length} contacts ·{" "}
              {people.filter((p) => p.hierarchyLevel).length} placed
            </span>
            <button
              className="button"
              disabled={!permitted || query.isFetching}
              onClick={() => setReviewing(true)}
            >
              Title-based hierarchy
            </button>
          </div>
          {review.length > 0 && (
            <div className={styles.review}>
              <img src="/design/411-50673-imgIconTriangleAlert.svg" alt="" />
              <span>
                {review.length} contacts need title or placement review. Verify
                roles before changing placement.
              </span>
              <button
                className="button"
                disabled={!permitted || query.isFetching}
                onClick={() => setReviewing(true)}
              >
                Review titles
              </button>
            </div>
          )}
          <p className={styles.legend}>
            Title tiers organize the roster. Blue lines show saved reports-to
            links.
          </p>
          {people.length ? (
            <OrganizationChart
              people={people}
              search={search}
              onSelect={open}
            />
          ) : (
            <p className="empty">
              No contacts. Add the first contact for this client.
            </p>
          )}
          <section className="card stack">
            <h3>Contact list</h3>
            {people.length > 0 &&
              !people.some((p) =>
                `${p.name} ${p.title ?? ""}`
                  .toLowerCase()
                  .includes(search.trim().toLowerCase()),
              ) && <p className="empty">No contacts match your search.</p>}
            {people
              .filter((p) =>
                `${p.name} ${p.title}`
                  .toLowerCase()
                  .includes(search.trim().toLowerCase()),
              )
              .map((p) => (
                <button
                  key={p.id}
                  className="button ghost"
                  onClick={() => open(p.id)}
                >
                  {p.name} · {p.title ?? "No title"}
                </button>
              ))}
          </section>
        </section>
      )}
      {selected && selected !== "new" && query.isSuccess && !person && (
        <p role="alert">
          This contact is no longer in the client roster.{" "}
          <button onClick={() => open(null)}>Close</button>
        </p>
      )}
      {records && (
        <ContactDrawer
          creation={creation}
          key={`${clientId}:${selected ?? "closed"}`}
          clientId={clientId}
          person={person}
          people={people}
          open={selected === "new" || Boolean(person)}
          onClose={() => open(null)}
        />
      )}
      <Dialog
        open={Boolean(records) && reviewing}
        onOpenChange={setReviewing}
        title="Review hierarchy"
        description="Automatic placements come from saved titles. Only saved reporting relationships create connecting lines."
      >
        <div className="stack">
          {people.map((p) => (
            <button
              key={p.id}
              className="button"
              onClick={() => {
                setReviewing(false);
                open(p.id);
              }}
            >
              {p.name} · {p.title ?? "No title"}
              {review.includes(p) ? " · Needs review" : ""}
            </button>
          ))}
          {people.length === 0 && <p>No contacts to configure.</p>}
        </div>
      </Dialog>
    </div>
  );
}
