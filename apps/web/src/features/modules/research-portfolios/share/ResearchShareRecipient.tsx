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
  const [session, setSession] = useState<{
    viewToken: string;
    expiresAt: string;
  }>();
  const viewToken = session?.viewToken;
  const sessionExpiresAt = session?.expiresAt;
  const [availabilityRevision, setAvailabilityRevision] = useState(0);
  const [dashboard, setDashboard] = useState<ResearchShareDashboard>();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
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
  }, [token, valid, availabilityRevision]);

  useEffect(() => {
    if (!viewToken) return;
    const controller = new AbortController();
    let pending = false;
    function endSession() {
      if (controller.signal.aborted) return;
      controller.abort();
      setSession(undefined);
      setDashboard(undefined);
      setLogoUrl(null);
      setAvailable(undefined);
      setAvailabilityRevision((value) => value + 1);
      setError("Your viewing session ended. Enter the PIN again.");
    }
    async function refresh() {
      if (
        pending ||
        controller.signal.aborted ||
        document.visibilityState === "hidden"
      )
        return;
      pending = true;
      try {
        const result = await api.request(
          "public-research-share.dashboard",
          { params: { token }, body: { viewToken: viewToken! } },
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) setDashboard(result);
      } catch {
        endSession();
      } finally {
        pending = false;
      }
    }
    const remaining = Date.parse(sessionExpiresAt ?? "") - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) {
      endSession();
      return;
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    const expiry = window.setTimeout(endSession, remaining);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.clearTimeout(expiry);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [token, viewToken, sessionExpiresAt]);

  useEffect(() => {
    if (!viewToken || !dashboard?.branding?.logoAvailable) return;
    const controller = new AbortController();
    api
      .request(
        "public-research-share.logo",
        { params: { token }, body: { viewToken } },
        { signal: controller.signal },
      )
      .then(
        (result) => {
          if (!controller.signal.aborted) setLogoUrl(result.url);
        },
        () => {
          if (!controller.signal.aborted) setLogoUrl(null);
        },
      );
    return () => controller.abort();
  }, [token, viewToken, dashboard?.branding?.logoAvailable]);

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
      setSession(session);
    } catch {
      setError("That PIN did not open this link. Check it and try again.");
      setAvailable(undefined);
      setAvailabilityRevision((value) => value + 1);
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
          <DashboardGrid
            layout={dashboard.layout}
            dashboard={dashboard}
            logoUrl={logoUrl}
          />
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
