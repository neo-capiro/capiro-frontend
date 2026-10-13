import { useFunnelLifetime } from "../../lib/FunnelLifetime";
import { useQuery } from "@tanstack/react-query";
import { useOnboardAttempt } from "../../lib/use-onboard-attempt";
import { AttemptStatus } from "../../ui/AttemptStatus";
// 1.10 Confirmation + provisioning bridge — F1Confirm (prototype/02-flow1.jsx).
// Explicit provisioning start with current read-only status recovery.
import React from "react";
import { useNavigate } from "../../navigation";
import {
  Btn,
  Card,
  FunnelShell,
  Icon,
  InfoBlock,
  Spinner,
  Tag,
} from "../../ui/primitives";
import {
  useFunnelApi,
  useFunnelSession,
  type FunnelSession,
} from "../../lib/funnel";

export function ConfirmPage() {
  const session = useFunnelSession();
  if (!session.data) return null;
  return <F1Confirm session={session.data} />;
}

function F1Confirm({ session }: { session: FunnelSession }) {
  const navigate = useNavigate();
  const api = useFunnelApi();
  const lifetime = useFunnelLifetime();
  const write = useOnboardAttempt(api, "provision");

  const [expired, setExpired] = React.useState(false);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setExpired(true), 4 * 60_000);
    return () => window.clearTimeout(timer);
  }, []);
  const status = useQuery({
    queryKey: [...lifetime.key, "provision-status"],
    queryFn: () => lifetime.read(api.getStatus),
    retry: false,
    refetchInterval: (query) =>
      !expired &&
      !query.state.error &&
      query.state.data?.state === "provisioning"
        ? 1500
        : false,
  });
  const current = status.isSuccess && !status.error ? status.data : undefined;
  const phase =
    current?.state === "provisioned" ? 4 : current?.tenantId ? 1 : 0;
  const failureReason =
    expired && current?.state === "provisioning"
      ? "Provisioning is taking longer than expected. Check current status or contact support@capiro.ai."
      : status.error
        ? "Current provisioning status is unavailable. Check status before taking another action."
        : current?.state === "failed"
          ? current.failureReason ||
            "Provisioning failed. Contact support@capiro.ai for recovery."
          : null;
  const start = async () => {
    if (write.blocked() || current?.state !== "org_setup") return;
    try {
      await write.run("Provision this workspace", async (guard) => {
        await guard.wait(() => api.provision());
        const refreshed = await guard.wait(() => status.refetch());
        if (refreshed.error) throw refreshed.error;
      });
    } catch {
      /* Unknown is retained; status recovery never resends. */
    }
  };

  const lines: [string, string][] = [
    ["Creating workspace…", "Done"],
    ["Confirming workspace status…", "Provisioned"],
    ["Finalizing setup…", "Ready for setup"],
  ];
  const designations = session.roleDesignations ?? [];
  const admins =
    session.roleMode === "self"
      ? [`${session.email} (Super Admin)`]
      : designations
          .filter((v) => v.email)
          .map(
            (v) =>
              `${v.email} (${v.role === "super" ? "Super Admin" : "Admin"})`,
          );
  const itAdminEmail = session.itAdminEmails?.length
    ? session.itAdminEmails.join(" · ")
    : null;
  const price = (Math.max(10, session.profiles ?? 10) * 200).toLocaleString();
  const receipt =
    session.plan === "trial" ? (
      <>
        $0 charged today · Trial begins when firm setup completes · then{" "}
        <b>$2,000/mo</b> ·{" "}
        {session.payMethod === "card"
          ? "Card on file"
          : session.payMethod === "wire"
            ? "Billed by wire"
            : "Billed by ACH"}
      </>
    ) : session.payMethod === "card" ? (
      <>
        Subscription setup confirmed · <b>${price}</b> per month · card on file
      </>
    ) : (
      <>
        Billing contact: <b>{session.email}</b> · Plan amount: <b>${price}</b> ·{" "}
        {session.payMethod === "wire"
          ? "Wire billing selected"
          : "ACH billing selected; settlement is not confirmed here"}
      </>
    );

  return (
    <FunnelShell step={8} maxWidth={560}>
      <AttemptStatus
        record={write.record}
        check={() => void status.refetch()}
      />
      {current?.state === "org_setup" && (
        <Btn disabled={write.locked} onClick={() => void start()}>
          Create workspace
        </Btn>
      )}
      <Btn disabled={status.isFetching} onClick={() => void status.refetch()}>
        Check current status
      </Btn>
      <Card style={{ textAlign: "center", padding: "40px 36px" }}>
        {failureReason ? (
          <>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--critical-soft)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 18px",
              }}
            >
              <Icon
                name="TriangleAlert"
                size={24}
                style={{ color: "var(--critical)" }}
              />
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
              We couldn&apos;t provision your workspace
            </h1>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 13,
                color: "var(--ink-2)",
                lineHeight: 1.6,
              }}
            >
              <span style={{ color: "var(--critical)" }}>{failureReason}</span>
              <br />
              Contact{" "}
              <a
                href="mailto:support@capiro.ai"
                style={{ color: "var(--accent)" }}
              >
                support@capiro.ai
              </a>{" "}
              and we&apos;ll get your firm set up.
            </p>
          </>
        ) : phase < 4 ? (
          <>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--accent-soft)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 20px",
              }}
            >
              <Spinner size={22} />
            </div>
            <h1
              style={{
                margin: "0 0 22px",
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
                fontSize: 24,
                letterSpacing: "-0.015em",
              }}
            >
              Provisioning your workspace
            </h1>
            <div
              style={{
                display: "grid",
                gap: 10,
                maxWidth: 320,
                margin: "0 auto",
                textAlign: "left",
              }}
            >
              {lines.map(([label, done], i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    color: phase > i ? "var(--ink-1)" : "var(--ink-3)",
                  }}
                >
                  {phase > i ? (
                    <Icon
                      name="CircleCheck"
                      size={16}
                      style={{ color: "var(--success)" }}
                    />
                  ) : phase === i ? (
                    <Spinner />
                  ) : (
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: "1.5px solid var(--border-strong)",
                        display: "inline-block",
                      }}
                    ></span>
                  )}
                  <span style={{ flex: 1 }}>{label}</span>
                  {phase > i && (
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--success)",
                      }}
                    >
                      ✓ {done}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--success-soft)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 18px",
              }}
            >
              <Icon
                name="Check"
                size={26}
                strokeWidth={2.6}
                style={{ color: "var(--success)" }}
              />
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
              {session.plan === "trial"
                ? "Your workspace is live."
                : "Payment confirmed — your workspace is live."}
            </h1>
            <p
              style={{
                margin: "8px 0 22px",
                fontSize: 13,
                color: "var(--ink-2)",
                lineHeight: 1.55,
              }}
            >
              Your firm&apos;s workspace is ready at{" "}
              <b
                style={{
                  fontFamily: "var(--font-mono)",
                  letterSpacing: 0,
                  fontSize: 12.5,
                }}
              >
                app.capiro.ai
              </b>{" "}
              — but setup isn&apos;t finished. Your admins take it from here.
              {session.plan === "trial" && (
                <>
                  <br />
                  Your{" "}
                  <b style={{ color: "var(--ink-1)" }}>
                    30-day free trial begins the day your firm finishes setting
                    up its workspace
                  </b>{" "}
                  — not today.
                </>
              )}
            </p>
            <div style={{ display: "grid", gap: 10, textAlign: "left" }}>
              <InfoBlock
                icon="Server"
                title="Platform created"
                tag={<Tag tone="success">Ready</Tag>}
              >
                Workspace created and health check passed.
              </InfoBlock>
              <InfoBlock icon="Send" title="Admin invites sent">
                Invites sent to: {admins.join(" · ")}
                {itAdminEmail ? (
                  <>
                    <br />
                    IT Admin invite sent to <b>{itAdminEmail}</b>
                  </>
                ) : null}
                <br />
                <span style={{ color: "var(--ink-3)" }}>
                  Each admin gets an email to create their Capiro credentials
                  and sign in — they&apos;ll land in the firm setup dashboard.
                </span>
              </InfoBlock>
              <InfoBlock
                icon="ReceiptText"
                title={session.plan === "trial" ? "Trial billing" : "Payment"}
              >
                {receipt}
              </InfoBlock>
              <div
                style={{
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--border-1)",
                  borderRadius: 6,
                  padding: "12px 14px",
                }}
              >
                <b
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--ink-3)",
                  }}
                >
                  What happens next
                </b>
                <ol
                  style={{
                    margin: "8px 0 0",
                    padding: "0 0 0 18px",
                    fontSize: 12,
                    color: "var(--ink-2)",
                    lineHeight: 1.7,
                  }}
                >
                  <li>
                    Admins create credentials and sign in to the setup dashboard
                  </li>
                  <li>
                    Firm-level setup: email authorization, client import, AI
                    settings
                  </li>
                  <li>The whole team is invited to log in to Capiro</li>
                </ol>
              </div>
            </div>
            {session.roleMode === "self" ? (
              <Btn
                variant="primary"
                onClick={() => navigate("/setup")}
                style={{ width: "100%", marginTop: 20 }}
                icon="ArrowRight"
              >
                Go to your setup dashboard
              </Btn>
            ) : (
              <div
                style={{
                  marginTop: 20,
                  fontSize: 12.5,
                  color: "var(--ink-2)",
                  textAlign: "center",
                }}
              >
                You&apos;re all set — your admins take it from here.
              </div>
            )}
          </>
        )}
      </Card>
    </FunnelShell>
  );
}
