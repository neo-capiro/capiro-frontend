import { clerkInputAttempt } from "../../lib/clerk-input-attempt";
import { useOnboardApi } from "@/shared/capiro/onboard-api";
import { useOnboardAttempt } from "../../lib/use-onboard-attempt";
import { AttemptStatus } from "../../ui/AttemptStatus";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
// 2A.0 — Admin invite → credential creation. Port of the prototype
// AcceptInvite create phase (the email-preview phase was demo-only), wired to
// Clerk's headless ticket flow (?__clerk_ticket=…).
import React from "react";
import { Navigate, useNavigate, useSearchParams } from "../../navigation";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import {
  Btn,
  Card,
  Field,
  TextInput,
  Spinner,
  Wordmark,
} from "../../ui/primitives";
import { ErrorText, errorMessage } from "../funnel/shared";
import { ConfirmedInputRefusal } from "../../lib/attempt-journal";
import {
  acceptInvitationTicket,
  acceptInvitePhase,
  invitationReturnPath,
  readInvitationStatus,
  type AcceptInvitePhase,
  type InvitationStatus,
  type ProviderOutcome,
} from "../../lib/accept-invite-flow";

const inlineErrorStyle: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--critical)",
  lineHeight: 1.45,
};

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const ticket = params.get("__clerk_ticket");
  const status = readInvitationStatus(params.get("__clerk_status"));
  return (
    <TicketAcceptance
      key={`${ticket ?? "none"}:${status ?? "none"}`}
      ticket={ticket}
      status={status}
    />
  );
}

function TicketAcceptance({
  ticket,
  status,
}: {
  ticket: string | null;
  status: InvitationStatus | null;
}) {
  const navigate = useNavigate();
  const api = useOnboardApi();
  const write = useOnboardAttempt(api, `accept-invitation:${ticket ?? "none"}`);
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const { isLoaded: signUpLoaded, signUp, setActive } = useSignUp();
  const { isLoaded: signInLoaded, signIn } = useSignIn();
  const clerk = useClerk();

  const [localPhase, setPhase] = React.useState<AcceptInvitePhase>("loading");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [holdStatus, setHoldStatus] = React.useState<string | null>(null);

  const confirmMismatch =
    confirmPassword.length > 0 && confirmPassword !== password;
  const sessionEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  const phase = acceptInvitePhase({
    authLoaded,
    signUpLoaded,
    signInLoaded,
    isSignedIn,
    ticket,
    status,
    localPhase,
  });

  /**
   * The single provider effect the invitation status selects, run inside the existing
   * attempt journal. An uncertain result is recorded against this attempt and the ticket is
   * never resubmitted from it.
   */
  const providerCall = (action: "sign_up" | "sign_in"): Promise<ProviderOutcome> =>
    write
      .run("Accept this invitation", async (guard) => {
        if (action === "sign_up") {
          if (!signUp) return { kind: "unknown" } as ProviderOutcome;
          await guard.wait(() =>
            signUp.create({ strategy: "ticket", ticket: ticket! }),
          );
          return { kind: "ok" } as ProviderOutcome;
        }
        if (!signIn) return { kind: "unknown" } as ProviderOutcome;
        const attempt = await guard.wait(() =>
          clerkInputAttempt(() =>
            signIn.create({ strategy: "ticket", ticket: ticket! }),
          ),
        );
        if (attempt.status === "complete" && attempt.createdSessionId)
          await guard.wait(() => setActive({ session: attempt.createdSessionId }));
        return {
          kind: "ok",
          status: attempt.status,
          createdSessionId: attempt.createdSessionId,
        } as ProviderOutcome;
      })
      .catch((err): ProviderOutcome => {
        if (err instanceof ConfirmedInputRefusal)
          return { kind: "refused", message: errorMessage(err) };
        // Transport error, 5xx or any other provider error: the journal already holds the
        // unknown outcome, so this attempt issues no second authentication effect.
        return { kind: "unknown" };
      });

  const begin = async () => {
    if (!ticket || !status || isSignedIn || write.blocked()) return;
    if ((status === "sign_up" ? !signUp : !signIn) || !signIn) return;
    setError(null);
    const outcome = await acceptInvitationTicket({ status, run: providerCall });
    if (outcome.kind === "signup-started") {
      setPhase("create");
      return;
    }
    if (outcome.kind === "signed-in" || outcome.kind === "complete") {
      navigate("/setup", { replace: true });
      return;
    }
    if (outcome.kind === "verification-hold") {
      setHoldStatus(outcome.status);
      setPhase("verification-hold");
      return;
    }
    if (outcome.kind === "refused") {
      setError(outcome.message);
      return;
    }
    setError(
      "We could not confirm this invitation. Check your current status before trying again.",
    );
  };

  const submit = async () => {
    if (!signUp || submitting || write.blocked()) return;
    if (password.length === 0 || password !== confirmPassword) return;
    setSubmitting(true);
    setError(null);
    try {
      await write.run("Complete this invited account", async (guard) => {
        const attempt = await guard.wait(() =>
          clerkInputAttempt(() => signUp.update({ password })),
        );
        if (attempt.status === "complete") {
          await guard.wait(() =>
            setActive({ session: attempt.createdSessionId }),
          );
          navigate("/setup", { replace: true });
        } else {
          setError(
            "Account creation needs another step — contact support@capiro.ai.",
          );
        }
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Sign out straight to the fixed same-origin invitation URL, which carries both provider
  // values. The provider performs the navigation, so nothing depends on post-sign-out
  // client navigation and no caller-supplied return URL is involved.
  const signOutAndAccept = () => {
    void clerk.signOut({ redirectUrl: invitationReturnPath(ticket, status) });
  };

  if (authLoaded && isSignedIn && !ticket)
    return <Navigate to="/setup" replace />;
  // A completed invitation is never consumed again; the current session just continues.
  if (authLoaded && isSignedIn && status === "complete")
    return <Navigate to="/setup" replace />;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-canvas)",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "48px 40px 64px",
        }}
      >
        <AttemptStatus record={write.record} />
        {error && <ErrorText>{error}</ErrorText>}
        {phase === "ready" ? (
          <Card>
            <h2>Accept your invitation</h2>
            <p>Continue to review this invitation and create your account.</p>
            <Btn disabled={write.locked} onClick={() => void begin()}>
              Review and accept invitation
            </Btn>
          </Card>
        ) : phase === "loading" ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "80px 0",
            }}
          >
            <Spinner size={18} />
          </div>
        ) : phase === "invalid-ticket" ? (
          <Card>
            <h2>This invitation can&apos;t be used</h2>
            <p>
              This link is malformed, has expired or was already accepted. Ask an
              administrator for a new invitation, or sign in if you already have an
              account.
            </p>
            <Btn variant="primary" onClick={() => navigate("/sign-in")}>
              Go to sign in
            </Btn>
          </Card>
        ) : phase === "verification-hold" ? (
          <Card>
            <h2>One more step to accept</h2>
            <p>
              This account needs an additional verification step before the invitation
              can be accepted
              {holdStatus ? ` (${holdStatus.replace(/_/g, " ")})` : ""}. Finish that
              step in sign in — this link is not reused.
            </p>
            <Btn variant="primary" onClick={() => navigate("/sign-in")}>
              Go to sign in
            </Btn>
          </Card>
        ) : phase === "complete" ? (
          <Card>
            <h2>This invitation is already accepted</h2>
            <p>Sign in with the invited address to continue.</p>
            <Btn variant="primary" onClick={() => navigate("/sign-in")}>
              Go to sign in
            </Btn>
          </Card>
        ) : phase === "signed-in-conflict" ? (
          <div style={{ width: "100%", maxWidth: 420, marginTop: 12 }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <Wordmark size={17} />
            </div>
            <Card style={{ padding: "28px 26px" }}>
              <h2
                style={{
                  margin: "0 0 6px",
                  fontFamily: "var(--font-serif)",
                  fontWeight: 500,
                  fontSize: 22,
                  letterSpacing: "-0.015em",
                }}
              >
                You&apos;re already signed in
              </h2>
              <p
                style={{
                  margin: "0 0 18px",
                  fontSize: 13,
                  color: "var(--ink-2)",
                  lineHeight: 1.6,
                }}
              >
                This browser is signed in as{" "}
                <b style={{ color: "var(--ink-1)" }}>
                  {userLoaded ? (sessionEmail ?? "another account") : "…"}
                </b>
                . If this invite was sent to someone else, continuing would add
                it to the wrong account.
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                <Btn
                  variant="primary"
                  onClick={signOutAndAccept}
                  style={{ width: "100%" }}
                >
                  Sign out and accept invite
                </Btn>
                <Btn
                  variant="ghost"
                  onClick={() => navigate("/setup", { replace: true })}
                  style={{ width: "100%" }}
                >
                  {userLoaded && sessionEmail
                    ? `Continue as ${sessionEmail}`
                    : "Continue as this user"}
                </Btn>
              </div>
            </Card>
          </div>
        ) : phase === "expired" ? (
          <div style={{ width: "100%", maxWidth: 400, marginTop: 12 }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <Wordmark size={17} />
            </div>
            <Card style={{ padding: "28px 26px", textAlign: "center" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  color: "var(--ink-1)",
                  fontWeight: 600,
                }}
              >
                Invite expired, contact your administrator
              </p>
            </Card>
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: 400, marginTop: 12 }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <Wordmark size={17} />
            </div>
            <Card style={{ padding: "28px 26px" }}>
              <h2
                style={{
                  margin: "0 0 4px",
                  fontFamily: "var(--font-serif)",
                  fontWeight: 500,
                  fontSize: 22,
                  letterSpacing: "-0.015em",
                }}
              >
                Create your account
              </h2>
              <p
                style={{
                  margin: "0 0 18px",
                  fontSize: 12.5,
                  color: "var(--ink-2)",
                }}
              >
                One credential works for both the setup dashboard and the Capiro
                app.
              </p>
              <div style={{ display: "grid", gap: 13 }}>
                <Field label="Email">
                  <TextInput
                    value={signUp?.emailAddress ?? ""}
                    readOnly
                    style={{ color: "var(--ink-3)" }}
                  />
                </Field>
                <Field label="Password">
                  <TextInput
                    disabled={write.locked}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
                <Field label="Confirm password">
                  <>
                    <TextInput
                      disabled={write.locked}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {confirmMismatch && (
                      <span style={inlineErrorStyle}>
                        Passwords do not match
                      </span>
                    )}
                  </>
                </Field>
                {error && (
                  <ErrorText style={{ marginTop: 0 }}>{error}</ErrorText>
                )}
                <Btn
                  variant="primary"
                  disabled={
                    submitting || confirmMismatch || password.length === 0
                  }
                  onClick={() => void submit()}
                  style={{ width: "100%", marginTop: 2 }}
                >
                  {submitting
                    ? "Creating account…"
                    : "Create account & sign in"}
                </Btn>
                <div id="clerk-captcha" />
              </div>
            </Card>
            <p
              style={{
                marginTop: 14,
                fontSize: 11.5,
                color: "var(--ink-3)",
                textAlign: "center",
                lineHeight: 1.55,
              }}
            >
              You&apos;ll land in the firm setup dashboard — the Capiro app
              unlocks once setup is complete.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
