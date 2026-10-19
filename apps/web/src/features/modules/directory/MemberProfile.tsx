"use client";
import Link from "next/link";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { DirectoryContact } from "../../../shared/capiro/operations/directory-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  PageHeader,
  Panel,
  StatusPanel,
  Tabs,
  TextArea,
} from "../../../shared/module-ui";
import styles from "./directory.module.css";
const tabs = [
  "Contact",
  "Staff",
  "Bio",
  "Committees",
  "Leadership",
  "Links",
  "News",
];
export function MemberProfile({
  contact,
  onBack,
  favorites,
}: {
  contact: DirectoryContact;
  onBack: () => void;
  favorites: { data?: { directoryContactId: string }[]; reload: () => void };
}) {
  const api = useCapiro();
  const [tab, setTab] = useState("Contact");
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const notes = useCapiroQuery("directory.notes", {
    params: { contactId: contact.id },
  });
  const news = useCapiroQuery(
    "directory.news",
    { params: { contactId: contact.id } },
    { enabled: tab === "News" },
  );
  const fec = useCapiroQuery("directory.fec", {
    params: { contactId: contact.id },
  });
  const starred = favorites.data?.some(
    (f) => f.directoryContactId === contact.id,
  );
  async function favorite() {
    setBusy(true);
    setError(undefined);
    try {
      if (starred)
        await api.request("directory.favorite.remove", {
          params: { contactId: contact.id },
        });
      else
        await api.request("directory.favorite.add", {
          params: { contactId: contact.id },
          body: { directoryContactName: contact.fullName },
        });
      favorites.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update favorite");
    } finally {
      setBusy(false);
    }
  }
  async function saveNote() {
    setBusy(true);
    setError(undefined);
    try {
      await api.request("directory.notes.create", {
        params: { contactId: contact.id },
        body: { body: note, directoryContactName: contact.fullName },
      });
      notes.reload();
      setAdding(false);
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save note");
    } finally {
      setBusy(false);
    }
  }
  const staff = (
    <Panel title="Staff" description={`${contact.staff.length} staffers`}>
      {contact.staff.map((s) => (
        <div key={s.id} className={styles.row}>
          <span>{s.fullName}</span>
          <span>
            {s.title} {s.email && <a href={`mailto:${s.email}`}>{s.email}</a>}
          </span>
        </div>
      ))}
    </Panel>
  );
  return (
    <>
      <ActionButton onClick={onBack}>Back to directory</ActionButton>
      <PageHeader
        title={contact.fullName}
        eyebrow="Directory"
        description={[
          contact.party,
          contact.state,
          contact.district,
          contact.chamber,
          contact.officeLocation,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <ActionButton disabled={busy} onClick={favorite}>
              {starred ? "★ Favorited" : "☆ Favorite"}
            </ActionButton>
            <ActionButton
              disabled
              title="The reviewed Directory API does not expose a client-association mutation."
            >
              Add to client
            </ActionButton>
            <Link
              href={`/modules/engagement?view=outreach&create=draft&directoryContactId=${encodeURIComponent(contact.id)}`}
            >
              Create outreach
            </Link>
          </>
        }
      />
      {error && <p role="alert">{error}</p>}
      <Tabs
        items={tabs.map((t) => ({ id: t, label: t }))}
        value={tab}
        onChange={setTab}
      />
      <div className={styles.split}>
        <div className={styles.stack}>
          {tab === "Contact" && (
            <>
              <Panel title="Contact">
                {(contact.addresses || []).map((a) => (
                  <div key={a.id} className={styles.row}>
                    <span>{a.title || "Office"}</span>
                    <span>
                      {[a.address1, a.city, a.state, a.phone]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                ))}
                {!contact.addresses?.length && (
                  <div className={styles.content}>
                    {contact.officeLocation || "Office address not provided"} ·{" "}
                    {contact.phone || "Phone not provided"}
                  </div>
                )}
              </Panel>
              {staff}
              <Panel
                title="Notes"
                description="Visible to your firm"
                actions={
                  <ActionButton onClick={() => setAdding(true)}>
                    + Add note
                  </ActionButton>
                }
              >
                <StatusPanel
                  loading={notes.loading}
                  error={notes.error}
                  onRetry={notes.reload}
                >
                  {notes.data?.map((n) => (
                    <div key={n.id} className={styles.row}>
                      <span>{n.body}</span>
                      <span>
                        {n.createdBy?.firstName || n.createdBy?.email || "Team"}{" "}
                        · {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {!notes.data?.length && (
                    <p className={styles.content}>No notes yet.</p>
                  )}
                </StatusPanel>
              </Panel>
            </>
          )}
          {tab === "Staff" && staff}
          {tab === "Bio" && (
            <Panel title="Bio">
              <div className={styles.content}>
                {contact.bio?.narrative || "Biography not provided"}
                {contact.bio?.education && <p>{contact.bio.education}</p>}
                {contact.bio?.military && <p>{contact.bio.military}</p>}
              </div>
            </Panel>
          )}
          {["Committees", "Leadership"].includes(tab) && (
            <Panel title={tab}>
              {(tab === "Committees"
                ? contact.committees
                : contact.leadershipPositions
              )?.map((t) => (
                <div key={t} className={styles.row}>
                  {t}
                </div>
              ))}
            </Panel>
          )}
          {tab === "Links" && (
            <Panel title="Official links">
              {contact.officialLinks?.map((l) => (
                <div key={l.url} className={styles.row}>
                  {/^https?:\/\//i.test(l.url) ? (
                    <a href={l.url} target="_blank" rel="noreferrer">
                      {l.label}
                    </a>
                  ) : (
                    <span>{l.label} · Link unavailable</span>
                  )}
                </div>
              ))}
            </Panel>
          )}
          {tab === "News" && (
            <Panel title="News">
              <StatusPanel
                loading={news.loading}
                error={news.error}
                onRetry={news.reload}
              >
                {news.data?.items.map((n) => (
                  <div className={styles.content} key={n.id}>
                    <a
                      href={/^https?:\/\//i.test(n.link) ? n.link : undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {n.title}
                    </a>
                    <p>{n.summary}</p>
                    <span className={styles.muted}>
                      {n.publishedAt
                        ? new Date(n.publishedAt).toLocaleDateString()
                        : "Publication date not provided"}
                    </span>
                  </div>
                ))}
                {!news.data?.items.length && (
                  <p className={styles.content}>No retained press items.</p>
                )}
              </StatusPanel>
            </Panel>
          )}
        </div>
        <div className={styles.stack}>
          <Panel title="Recent touches">
            {contact.recentInteractions?.map((r, i) => (
              <div key={`${r.date}:${i}`} className={styles.row}>
                <span>{r.summary}</span>
                <span>{r.date}</span>
              </div>
            ))}
            {!contact.recentInteractions?.length && (
              <p className={styles.content}>No recorded touches.</p>
            )}
          </Panel>
          <Panel title="Giving and FEC" description="For your mapped clients">
            <StatusPanel
              loading={fec.loading}
              error={fec.error}
              onRetry={fec.reload}
            >
              {fec.data?.clients.map((c) => (
                <div key={c.clientId} className={styles.row}>
                  <span>{c.clientName}</span>
                  <span>
                    {c.totalAmount.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </span>
                </div>
              ))}
              <p className={styles.content}>{fec.data?.disclaimer}</p>
            </StatusPanel>
          </Panel>
        </div>
      </div>
      {adding && (
        <Modal open={adding} onOpenChange={setAdding} title="Add note">
          <Field label="Note" htmlFor="directory-note">
            <TextArea
              id="directory-note"
              maxLength={4000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <ActionButton
            primary
            disabled={busy || !note.trim()}
            onClick={saveNote}
          >
            Save note
          </ActionButton>
        </Modal>
      )}
    </>
  );
}
