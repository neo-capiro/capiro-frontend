import { clerkInputAttempt } from "../../lib/clerk-input-attempt";
import { useOnboardAttempt } from "../../lib/use-onboard-attempt";
import { AttemptStatus, PendingFields } from "../../ui/AttemptStatus";
import { useSignUp } from "@clerk/nextjs/legacy";
// 1.2 Purchaser Registration — F1Register (prototype/02-flow1.jsx), wired to a
// headless Clerk sign-up (useSignUp) + POST /funnel/register.
import React from "react";
import { useNavigate } from "../../navigation";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useQueryClient } from "@tanstack/react-query";
import {
  Btn,
  Card,
  Field,
  FunnelShell,
  ScreenTitle,
  TextInput,
} from "../../ui/primitives";
import {
  clearRegistrationDraft,
  draftMatchesUser,
  FUNNEL_SESSION_KEY,
  readRegistrationDraft,
  refreshFunnelSession,
  storeRegistrationDraft,
  useFunnelApi,
} from "../../lib/funnel";
import { routeForState } from "./FunnelStepGuard";
import { ErrorText, errorMessage } from "./shared";

interface FieldErrors {
  email?: string;
  password?: string;
  form?: string;
}

function clerkFieldErrors(err: unknown): FieldErrors {
  if (isClerkAPIResponseError(err)) {
    const out: FieldErrors = {};
    const general: string[] = [];
    for (const e of err.errors) {
      const message = e.longMessage || e.message;
      const param = (e.meta as { paramName?: string } | undefined)?.paramName;
      if (param === "email_address" && !out.email) out.email = message;
      else if (param === "password" && !out.password) out.password = message;
      else general.push(message);
    }
    if (general.length) out.form = general.join(" ");
    return out;
  }
  return { form: errorMessage(err) };
}

const inlineErrorStyle: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--critical)",
  lineHeight: 1.45,
};

export function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const api = useFunnelApi();
  const write = useOnboardAttempt(api, "register");
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: signUpLoaded, signUp, setActive } = useSignUp();
  const { isLoaded: userLoaded, user } = useUser();
  const clerk = useClerk();
  const sessionEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [orgName, setOrgName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const confirmMismatch =
    confirmPassword.length > 0 && confirmPassword !== password;

  const restoreDraft = () => {
    if (!authLoaded || !userLoaded || !isSignedIn) return;
    const draft = readRegistrationDraft();
    if (!draftMatchesUser(draft, sessionEmail)) {
      setErrors({ form: "No saved draft matches this account." });
      return;
    }
    setFirstName(draft?.firstName ?? "");
    setLastName(draft?.lastName ?? "");
    setOrgName(draft?.orgName ?? "");
    setEmail(sessionEmail ?? "");
  };

  const checkCurrent = async () => {
    const guard = write.guard();
    try {
      const snapshot = await guard.wait(() =>
        write.reconcile(
          () => refreshFunnelSession(queryClient, api.getSession),
          (value) => value !== null,
        ),
      );
      if (!snapshot)
        throw new Error("No current funnel registration was found.");
      navigate(routeForState(snapshot.state), { replace: true });
    } catch {
      if (guard.current())
        setErrors({
          form: "Registration is still unconfirmed. Keep the draft and contact support before submitting again.",
        });
    }
  };

  const submit = async () => {
    if (
      write.locked ||
      submitting ||
      (!isSignedIn && (!password || password !== confirmPassword))
    )
      return;
    const typed = email.trim().toLowerCase();
    if (
      isSignedIn &&
      (!sessionEmail || (typed && typed !== sessionEmail.toLowerCase()))
    ) {
      setErrors({
        email: `This registration belongs to ${sessionEmail ?? "the current account"}. Sign out to use a different account.`,
      });
      return;
    }
    if (!isSignedIn && (!signUpLoaded || !signUp)) return;
    setSubmitting(true);
    setErrors({});
    try {
      await write.run(
        "Create this account and register the reviewed firm",
        async (guard) => {
          storeRegistrationDraft({
            firstName,
            lastName,
            orgName,
            email: isSignedIn ? sessionEmail! : email.trim(),
          });
          if (isSignedIn) {
            const snapshot = await guard.wait(() =>
              api.register({ firstName, lastName, orgName }),
            );
            clearRegistrationDraft();
            queryClient.setQueryData(FUNNEL_SESSION_KEY, snapshot);
            navigate(routeForState(snapshot.state), { replace: true });
            return;
          }
          const result = await guard.wait(() =>
            clerkInputAttempt(() =>
              signUp!.create({
                emailAddress: email,
                password,
                firstName,
                lastName,
              }),
            ),
          );
          if (result.status === "complete") {
            // Activation deliberately replaces authority. Registration happens only
            // from a new explicit action after the current identity is available.
            const activate = setActive;
            const createdSessionId = result.createdSessionId;
            if (!activate || !createdSessionId)
              throw new Error(
                "The account was created, but sign-in activation is unavailable. Sign in before continuing registration.",
              );
            await guard.wait(() => activate({ session: createdSessionId }));
            navigate("/register", { replace: true });
          } else navigate("/verify");
        },
      );
    } catch (err) {
      if (write.guard().current()) setErrors(clerkFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FunnelShell step={0}>
      <AttemptStatus record={write.record} check={() => void checkCurrent()} />
      <PendingFields disabled={write.locked}>
        {isSignedIn && (
          <Btn onClick={restoreDraft}>Restore this account’s saved draft</Btn>
        )}
        <ScreenTitle
          kicker="Create your organization"
          title="Let's get your firm set up"
          sub="You're registering as the purchaser and billing contact for your organization."
        />
        <Card>
          <div style={{ display: "grid", gap: 14 }}>
            {isSignedIn && sessionEmail && (
              <div
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  background: "var(--accent-soft)",
                  border: "1px solid var(--accent)",
                  borderRadius: 6,
                  padding: "10px 14px",
                  color: "var(--accent-ink)",
                }}
              >
                You&apos;re signed in as <b>{sessionEmail}</b> — this
                registration (and the new workspace) will belong to that
                account.{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    void clerk.signOut();
                  }}
                  style={{ color: "var(--accent-ink)", fontWeight: 700 }}
                >
                  Sign out
                </a>{" "}
                to register as someone else.
              </div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="First name">
                <TextInput
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </Field>
              <Field label="Last name">
                <TextInput
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Work email">
              <>
                <TextInput
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && (
                  <span style={inlineErrorStyle}>{errors.email}</span>
                )}
              </>
            </Field>
            <Field label="Organization name">
              <TextInput
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </Field>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="Password">
                <>
                  <TextInput
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {errors.password && (
                    <span style={inlineErrorStyle}>{errors.password}</span>
                  )}
                </>
              </Field>
              <Field label="Confirm password">
                <>
                  <TextInput
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {confirmMismatch && (
                    <span style={inlineErrorStyle}>Passwords do not match</span>
                  )}
                </>
              </Field>
            </div>
            {errors.form && (
              <ErrorText style={{ marginTop: 0 }}>{errors.form}</ErrorText>
            )}
            <Btn
              variant="primary"
              // Every early-return in submit() is mirrored here so the button
              // never presents an enabled dead click (e.g. password filled but
              // confirm-password still empty).
              disabled={
                submitting ||
                !firstName.trim() ||
                !lastName.trim() ||
                !orgName.trim() ||
                (!isSignedIn &&
                  (!email.trim() ||
                    !password ||
                    !confirmPassword ||
                    confirmMismatch))
              }
              onClick={() => void submit()}
              style={{ marginTop: 4, width: "100%" }}
            >
              {submitting
                ? "Creating account…"
                : isSignedIn
                  ? "Register this firm"
                  : "Create Account"}
            </Btn>
            <div id="clerk-captcha" />
          </div>
        </Card>
        <div
          style={{
            marginTop: 14,
            fontSize: 12,
            color: "var(--ink-3)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          No platform account or role is created yet — that happens after
          checkout.
          <br />
          Already have an account?{" "}
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{ color: "var(--accent)" }}
          >
            Sign in
          </a>
        </div>
      </PendingFields>
    </FunnelShell>
  );
}
