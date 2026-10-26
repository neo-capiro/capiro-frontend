"use client";
import { useEffect, useState, type FormEvent } from "react";
import { createCapiroApi } from "../../../../shared/capiro/http";
import { publicResearchShareOperations } from "../../../../shared/capiro/operations/research-share-public";
import type { ResearchShareDashboard } from "../../../../shared/capiro/operations/research-share-schemas";
import {
  ActionButton,
  Field,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import { DashboardGrid } from "./DashboardGrid";
import styles from "./share.module.css";

const api = createCapiroApi(publicResearchShareOperations, {
  credentials: "omit",
});
const TOKEN = /^[0-9a-f]{64}$/;
const UNAVAILABLE =
  "This link is not available. It may have expired or been withdrawn.";

/**
 * Recipient page: link token in the address, portfolio PIN typed here, then the
 * frozen dashboard. The view token lives in memory only; a reload asks for the
 * PIN again, and the Core service ends the session after 30 minutes anyway.
 */
export function ResearchShareRecipient({ token }: { token: string }) {
  const [available, setAvailable] = useState<boolean>();
  const [viewToken, setViewToken] = useState<string>();
  const [dashboard, setDashboard] = useState<ResearchShareDashboard>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState("");
  const valid = TOKEN.test(token);

  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    api
      .request(
        "public-research-share.availability",
        { params: { token } },
        { signal: controller.signal },
      )
      .then(
        (result) => {
          if (!controller.signal.aborted) setAvailable(result.available);
        },
        () => {
          if (!controller.signal.aborted) setAvailable(false);
        },
      );
    return () => controller.abort();
  }, [token, valid]);

  useEffect(() => {
    if (!viewToken) return;
    const controller = new AbortController();
    api
      .request(
        "public-research-share.dashboard",
        { params: { token }, body: { viewToken } },
        { signal: controller.signal },
      )
      .then(
        (result) => {
          if (!controller.signal.aborted) setDashboard(result);
        },
        () => {
          if (controller.signal.aborted) return;
          setViewToken(undefined);
          setDashboard(undefined);
          setError("Your viewing session ended. Enter the PIN again.");
        },
      );
    return () => controller.abort();
  }, [token, viewToken]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const session = await api.request("public-research-share.pin", {
        params: { token },
        body: { pin },
      });
      setPin("");
      setViewToken(session.viewToken);
    } catch {
      setError("That PIN did not open this link. Check it and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!valid || available === false)
    return (
      <main className={styles.page}>
        <section className={styles.gate} aria-label="Link unavailable">
          <p className={styles.eyebrow}>Capiro</p>
          <h1>Link not available</h1>
          <p className={styles.description}>{UNAVAILABLE}</p>
        </section>
      </main>
    );
  if (dashboard)
    return (
      <main className={styles.page}>
        <div className={styles.frame}>
          <DashboardGrid layout={dashboard.layout} dashboard={dashboard} />
          <footer className={styles.footer}>
            <span>
              {dashboard.branding
                ? `Prepared by ${dashboard.branding.firmName} with Capiro`
                : "Prepared with Capiro"}
              {" · "}snapshot {dashboard.snapshot.name}
            </span>
            <span>
              Available until{" "}
              {new Date(dashboard.expiresAt).toLocaleDateString()}
            </span>
          </footer>
        </div>
      </main>
    );
  return (
    <main className={styles.page}>
      <section className={styles.gate} aria-label="Enter PIN">
        <p className={styles.eyebrow}>Capiro</p>
        <h1>Enter the PIN to open this dashboard</h1>
        <p className={styles.description}>
          The PIN was given to you separately by the firm that shared this link.
        </p>
        <StatusPanel
          loading={available === undefined || Boolean(viewToken && !dashboard)}
        >
          <form onSubmit={submit} className={styles.form}>
            <Field label="PIN" htmlFor="share-pin" error={error}>
              <TextInput
                id="share-pin"
                className={styles.pin}
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={12}
                value={pin}
                disabled={busy}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
            </Field>
            <div>
              <ActionButton
                primary
                type="submit"
                disabled={busy || pin.length < 6}
              >
                Open dashboard
              </ActionButton>
            </div>
          </form>
        </StatusPanel>
      </section>
    </main>
  );
}
