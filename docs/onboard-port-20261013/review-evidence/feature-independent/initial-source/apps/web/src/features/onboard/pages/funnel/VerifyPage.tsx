import { clerkInputAttempt } from "../../lib/clerk-input-attempt";
import { useOnboardAttempt } from "../../lib/use-onboard-attempt";
import { AttemptStatus } from "../../ui/AttemptStatus";
import { useSignUp } from "@clerk/nextjs/legacy";
// 1.3 Email Verification — F1Verify (prototype/02-flow1.jsx), wired to Clerk's
// email_code sign-up verification (prepareEmailAddressVerification +
// attemptEmailAddressVerification). The Clerk instance issues one-time codes,
// not magic links (email_link is disabled), so we send a 6-digit code and
// verify it inline in the same tab — no redirect-URL round-trip.
import React from "react";
import { Navigate, useNavigate } from "../../navigation";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { Btn, Card, FunnelShell, Icon, TextInput } from "../../ui/primitives";
import {
  FUNNEL_SESSION_KEY,
  useFunnelApi,
  useFunnelSession,
} from "../../lib/funnel";
import { ErrorText, errorMessage } from "./shared";

export function VerifyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const api = useFunnelApi();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: signUpLoaded, signUp, setActive } = useSignUp();
  const session = useFunnelSession();
  const codeSend = useOnboardAttempt(api, "verification-code-send");
  const codeVerify = useOnboardAttempt(api, "verification-code-verify");
  const check = useOnboardAttempt(api, "verification-check");
  const [flowError, setFlowError] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [finalizing, setFinalizing] = React.useState(false);
  const signUpInProgress = !!signUp?.emailAddress;
  const email = session.data?.email || signUp?.emailAddress || "";
  const verified =
    session.isSuccess &&
    !session.error &&
    !!session.data &&
    session.data.state !== "registered";
  const submitting = codeSend.pending || codeVerify.pending || check.pending;
  const sendCode = async () => {
    if (!signUp || codeSend.blocked()) return;
    setFlowError(null);
    try {
      await codeSend.run("Send a verification code", (guard) =>
        guard.wait(() =>
          signUp.prepareEmailAddressVerification({ strategy: "email_code" }),
        ),
      );
    } catch (err) {
      setFlowError(errorMessage(err));
    }
  };
  const submitCode = async () => {
    if (!signUp || codeVerify.blocked() || code.trim().length < 6) return;
    setFlowError(null);
    try {
      await codeVerify.run("Verify this email code", async (guard) => {
        const result = await guard.wait(() =>
          clerkInputAttempt(() =>
            signUp.attemptEmailAddressVerification({ code: code.trim() }),
          ),
        );
        if (result.status !== "complete") {
          setFlowError(
            "Verification needs another step. Review the current sign-up before continuing.",
          );
          return;
        }
        setFinalizing(true);
        await guard.wait(() => setActive({ session: result.createdSessionId }));
        navigate("/register", { replace: true });
      });
    } catch (err) {
      setFlowError(errorMessage(err));
    } finally {
      setFinalizing(false);
    }
  };
  const checkVerification = async () => {
    if (
      !isSignedIn ||
      !session.isSuccess ||
      session.error ||
      !session.data ||
      check.blocked()
    )
      return;
    try {
      await check.run("Check the current email verification", async (guard) => {
        await guard.wait(() => api.verifyCheck());
        const current = await guard.wait(() => api.getSession());
        queryClient.setQueryData(FUNNEL_SESSION_KEY, current);
      });
    } catch (err) {
      setFlowError(errorMessage(err));
    }
  };
  const readCurrent = async () => {
    const guard = check.guard();
    try {
      const current = await guard.wait(() =>
        check.reconcile(
          () => api.getSession(),
          (value) => value.state !== "registered",
        ),
      );
      queryClient.setQueryData(FUNNEL_SESSION_KEY, current);
    } catch (err) {
      if (guard.current()) setFlowError(errorMessage(err));
    }
  };

  if (!authLoaded || !signUpLoaded) return null;
  // Nothing to verify: no sign-up in flight and no signed-in session — but
  // NEVER bounce while a completed sign-up is finalizing: in that window the
  // sign-up resource is already consumed and isSignedIn hasn't flipped yet,
  // so this guard used to fire and dump the user back on /register.
  if (!isSignedIn && !signUpInProgress && !finalizing) {
    return <Navigate to="/register" replace />;
  }

  return (
    <FunnelShell step={1} maxWidth={460}>
      <Card style={{ textAlign: "center", padding: "40px 36px" }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "var(--accent-soft)",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 18px",
          }}
        >
          <Icon name="MailCheck" size={24} style={{ color: "var(--accent)" }} />
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
            fontSize: 26,
            letterSpacing: "-0.015em",
          }}
        >
          Check your inbox
        </h1>
        <p
          style={{
            margin: "10px 0 22px",
            fontSize: 13.5,
            color: "var(--ink-2)",
            lineHeight: 1.6,
          }}
        >
          Request a 6-digit verification code for{" "}
          <b style={{ color: "var(--ink-1)" }}>{email}</b>.
          <br />
          Enter it below to verify your email — you can’t continue until it’s
          verified.
        </p>
        <AttemptStatus record={codeSend.record} />
        <AttemptStatus record={codeVerify.record} />
        <AttemptStatus record={check.record} check={() => void readCurrent()} />
        {isSignedIn && !session.data && (
          <Btn onClick={() => navigate("/register")}>
            Continue firm registration
          </Btn>
        )}
        {isSignedIn && session.data && !verified && (
          <Btn disabled={check.locked} onClick={() => void checkVerification()}>
            Check verification
          </Btn>
        )}
        {!isSignedIn && !verified ? (
          <div style={{ display: "grid", gap: 10 }}>
            <TextInput
              disabled={codeVerify.locked}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitCode();
              }}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="Verification code"
              style={{
                textAlign: "center",
                letterSpacing: "0.4em",
                fontSize: 18,
                fontWeight: 600,
              }}
            />
            <Btn
              variant="primary"
              disabled={
                code.trim().length < 6 || submitting || codeVerify.locked
              }
              onClick={() => void submitCode()}
            >
              {submitting ? "Verifying…" : "Verify email"}
            </Btn>
          </div>
        ) : verified ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--success)",
              }}
            >
              <Icon name="CircleCheck" size={15} />
              Email verified
            </div>
            <Btn variant="primary" onClick={() => navigate("/plan")}>
              Continue
            </Btn>
          </div>
        ) : null}
        {flowError && <ErrorText>{flowError}</ErrorText>}
        {!isSignedIn && (
          <Btn
            disabled={codeSend.locked || submitting}
            onClick={() => void sendCode()}
          >
            {codeSend.record?.phase === "confirmed"
              ? "Resend code"
              : "Send verification code"}
          </Btn>
        )}
      </Card>
    </FunnelShell>
  );
}
