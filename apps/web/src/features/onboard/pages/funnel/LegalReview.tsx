import { useOnboardAttempt } from "../../lib/use-onboard-attempt";
import { AttemptStatus, PendingFields } from "../../ui/AttemptStatus";
import { routeForState } from "../../lib/funnel-routes";
import React, { useSyncExternalStore } from "react";
import { useNavigate } from "../../navigation";
import {
  Btn,
  Card,
  Checkbox,
  Field,
  FunnelShell,
  Icon,
  ScreenTitle,
  Spinner,
  TextInput,
} from "../../ui/primitives";
import {
  useAdvanceSession,
  useFunnelApi,
  type LegalDoc,
  type FunnelSession,
} from "../../lib/funnel";
import type { createLegalReviewLifetime } from "../../lib/legal-review-lifetime";
import { ErrorText, errorMessage } from "./shared";
import { LegalBlock } from "./LegalDocumentBlock";

/** Static blank (unsigned) formal PDFs served from onboard-web/public. */
const BLANK_PDF: Record<"tos" | "sa", { href: string; title: string }> = {
  tos: {
    href: "/onboard/legal-docs/Capiro-Terms-of-Service.pdf",
    title: "Terms of Service",
  },
  sa: {
    href: "/onboard/legal-docs/Capiro-Subscription-Agreement.pdf",
    title: "Subscription Agreement",
  },
};

/** Trigger a browser download for a fetched Blob (auth-gated signed copy). */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function LegalReview({
  snapshot,
  documents,
  review,
}: {
  snapshot: FunnelSession;
  documents: LegalDoc[];
  review: ReturnType<typeof createLegalReviewLifetime>;
}) {
  const navigate = useNavigate();
  const api = useFunnelApi();
  const write = useOnboardAttempt(api, "legal-acceptance", review.current);
  const advanceSession = useAdvanceSession();
  const current = useSyncExternalStore(
    review.subscribe,
    review.current,
    () => false,
  );

  const [tosChecked, setTosChecked] = React.useState(false);
  const [saChecked, setSaChecked] = React.useState(false);
  const [enteredSignerName, setSignerName] = React.useState<string | null>(
    null,
  );
  const [signerTitle, setSignerTitle] = React.useState("");
  const [authority, setAuthority] = React.useState(false);
  const [emailCopy, setEmailCopy] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [signed, setSigned] = React.useState(false);
  const [dlBusy, setDlBusy] = React.useState<"tos" | "sa" | null>(null);
  const [dlError, setDlError] = React.useState<string | null>(null);

  const tos = documents.find((doc) => doc.docType === "tos")!;
  const sa = documents.find((doc) => doc.docType === "sa")!;

  const orgName = snapshot?.orgName?.trim() || "your organization";
  const email = snapshot?.email ?? "";

  // Prefill the signer name from the registered purchaser once, without
  // clobbering an edit the user has already made.
  const suggestedName = snapshot
    ? `${snapshot.firstName ?? ""} ${snapshot.lastName ?? ""}`.trim()
    : "";
  const signerName = enteredSignerName ?? suggestedName;

  const ok =
    current &&
    tosChecked &&
    saChecked &&
    signerName.trim().length > 0 &&
    signerTitle.trim().length > 0 &&
    authority &&
    !!tos &&
    !!sa;

  const submit = async () => {
    if (!ok || busy || write.blocked() || !tos || !sa) return;
    setBusy(true);
    setError(null);
    try {
      await write.run(
        `Accept terms ${tos.version} and agreement ${sa.version} as ${signerName.trim()} (${signerTitle.trim()})`,
        async (guard) => {
          await guard.wait(() =>
            api.acceptLegal({
              tosVersion: tos.version,
              saVersion: sa.version,
              signerName: signerName.trim(),
              signerTitle: signerTitle.trim(),
              signatureName: signerName.trim(),
              emailCopy,
            }),
          );
          setSigned(true);
        },
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const download = async (docType: "tos" | "sa") => {
    setDlBusy(docType);
    setDlError(null);
    const guard = write.guard();
    try {
      const { blob, filename } = await guard.wait(() =>
        api.downloadSigned(docType),
      );
      saveBlob(blob, filename);
    } catch (err) {
      setDlError(errorMessage(err));
    } finally {
      setDlBusy(null);
    }
  };

  const continueToBilling = async () => {
    const guard = write.guard();
    try {
      const current = await guard.wait(() => advanceSession(guard));
      navigate(routeForState(current.state));
    } catch (err) {
      if (guard.current()) setError(errorMessage(err));
    }
  };
  if (!current)
    return (
      <FunnelShell step={3}>
        <ErrorText>
          Current legal review changed. Wait for current documents before
          reviewing again.
        </ErrorText>
      </FunnelShell>
    );

  if (signed) {
    return (
      <FunnelShell step={3} maxWidth={620}>
        <ScreenTitle
          title="Agreements signed"
          sub="Your acceptance is recorded with a timestamped audit trail."
        />
        <Card style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon
              name="CircleCheck"
              size={20}
              style={{ color: "var(--success)" }}
            />
            <b style={{ fontSize: 15 }}>Signed by {signerName.trim()}</b>
          </div>
          {emailCopy && email && (
            <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
              A copy of the signed agreements is on its way to <b>{email}</b>.
            </div>
          )}
          <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
            Download your countersigned copies (each includes a Certificate of
            Completion):
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn
              variant="secondary"
              icon={dlBusy === "tos" ? undefined : "Download"}
              disabled={dlBusy !== null}
              onClick={() => void download("tos")}
            >
              {dlBusy === "tos" && <Spinner size={13} />}
              Signed Terms of Service
            </Btn>
            <Btn
              variant="secondary"
              icon={dlBusy === "sa" ? undefined : "Download"}
              disabled={dlBusy !== null}
              onClick={() => void download("sa")}
            >
              {dlBusy === "sa" && <Spinner size={13} />}
              Signed Subscription Agreement
            </Btn>
          </div>
          {dlError && <ErrorText>{dlError}</ErrorText>}
        </Card>
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}
        >
          <Btn variant="primary" onClick={() => void continueToBilling()}>
            Continue
          </Btn>
        </div>
      </FunnelShell>
    );
  }

  // ── Review + sign ───────────────────────────────────────────────────────────
  return (
    <FunnelShell step={3} maxWidth={620}>
      <AttemptStatus
        record={write.record}
        check={() => void continueToBilling()}
      />
      <PendingFields disabled={write.locked}>
        <ScreenTitle
          title="Review and sign the agreements"
          sub="Both agreements must be accepted to continue. Your signature is logged with a timestamp, IP address, and a copy of the document you signed."
        />
        <div style={{ display: "grid", gap: 16 }}>
          <LegalBlock
            title="Terms of Service"
            html={tos?.html ?? ""}
            checked={tosChecked}
            onChange={setTosChecked}
            downloadHref={tos ? BLANK_PDF.tos.href : undefined}
            label={
              <span>
                I agree to the <b>Terms of Service</b>
              </span>
            }
          />
          <LegalBlock
            title="Subscription Agreement"
            html={sa?.html ?? ""}
            checked={saChecked}
            onChange={setSaChecked}
            downloadHref={sa ? BLANK_PDF.sa.href : undefined}
            label={
              <span>
                I agree to the <b>Subscription Agreement</b>
              </span>
            }
          />

          <Card style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="Save" size={15} style={{ color: "var(--ink-3)" }} />
              <b style={{ fontSize: 13.5 }}>Sign electronically</b>
            </div>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <Field label="Full legal name">
                <TextInput
                  value={signerName}
                  placeholder="Jane Doe"
                  onChange={(e) => {
                    setSignerName(e.target.value);
                  }}
                />
              </Field>
              <Field label="Title">
                <TextInput
                  value={signerTitle}
                  placeholder="Managing Partner"
                  onChange={(e) => setSignerTitle(e.target.value)}
                />
              </Field>
            </div>
            <div>
              <div
                style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}
              >
                Signature
              </div>
              <div
                style={{
                  borderBottom: "1.5px solid var(--border-strong)",
                  padding: "6px 4px 8px",
                  minHeight: 40,
                  display: "flex",
                  alignItems: "flex-end",
                }}
              >
                <span
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontStyle: "italic",
                    fontSize: 26,
                    lineHeight: 1,
                    color: signerName.trim() ? "var(--ink-1)" : "var(--ink-4)",
                  }}
                >
                  {signerName.trim()
                    ? `/s/  ${signerName.trim()}`
                    : "Type your name above to sign"}
                </span>
              </div>
            </div>
            <Checkbox checked={authority} onChange={setAuthority}>
              <span>
                I am authorized to bind <b>{orgName}</b> to these agreements,
                and I agree that my typed signature is the legal equivalent of
                my handwritten signature.
              </span>
            </Checkbox>
            <Checkbox checked={emailCopy} onChange={setEmailCopy}>
              <span>
                Email me a copy of the signed agreements
                {email ? <> ({email})</> : null}
              </span>
            </Checkbox>
          </Card>
        </div>

        {error && <ErrorText style={{ textAlign: "right" }}>{error}</ErrorText>}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 20,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
            Need custom terms?{" "}
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{ color: "var(--accent)" }}
            >
              Contact us
            </a>
          </span>
          <Btn
            variant="primary"
            disabled={!ok || busy}
            onClick={() => void submit()}
          >
            {busy && <Spinner size={13} color="#fff" />}
            Sign &amp; continue
          </Btn>
        </div>
      </PendingFields>
    </FunnelShell>
  );
}
