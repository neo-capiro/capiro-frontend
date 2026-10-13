import { useOnboardAttempt } from "../../lib/use-onboard-attempt";
import { AttemptStatus } from "../../ui/AttemptStatus";
import React from "react";
import { useAuth, useOrganizationList, useUser } from "@clerk/nextjs";
import { Btn, Card, Spinner } from "../../ui/primitives";
import { useConfig } from "../../useConfig";
import { ErrorText, errorMessage } from "../funnel/shared";
import { useSetupApi, type SetupState } from "../../lib/setup";
import { ExtShell } from "./ExtShell";
export function CenteredNotice({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, margin: "40px auto 0" }}>
      <Card style={{ textAlign: "center", padding: "40px 36px" }}>
        {children}
      </Card>
    </div>
  );
}
export function WorkspaceMembership({
  legacyState,
}: {
  legacyState?: SetupState;
}) {
  const config = useConfig();
  const setupApi = useSetupApi();
  const activation = useOnboardAttempt(setupApi, "activate-membership");
  const { orgId } = useAuth();
  const { user } = useUser();
  const orgList = useOrganizationList({ userMemberships: { pageSize: 10 } });
  const memberships = orgList.userMemberships?.data ?? [];
  const [itError, setItError] = React.useState<string | null>(null);
  if (legacyState) {
    const S = legacyState;
    if (S.legacyTenant) {
      const otherOrgs = (orgList.userMemberships?.data ?? []).filter(
        (m) => m.organization.id !== orgId,
      );
      return (
        <ExtShell orgName={S.orgName}>
          <CenteredNotice>
            <AttemptStatus record={activation.record} />
            {itError && <ErrorText>{itError}</ErrorText>}
            <p
              style={{
                margin: "0 0 16px",
                fontSize: 13.5,
                color: "var(--ink-2)",
                lineHeight: 1.6,
              }}
            >
              You&apos;re signed in as{" "}
              <b>{user?.primaryEmailAddress?.emailAddress}</b> with the{" "}
              <b>{S.orgName}</b> workspace active — that workspace doesn&apos;t
              use this setup dashboard.
            </p>
            {otherOrgs.length > 0 && (
              <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                {otherOrgs.map((m) => (
                  <Btn
                    key={m.organization.id}
                    variant="primary"
                    disabled={activation.locked || !orgList.setActive}
                    onClick={() => {
                      const activate = orgList.setActive;
                      if (!activate) return;
                      void activation
                        .run(`Activate ${m.organization.name}`, (guard) =>
                          guard.wait(() =>
                            activate({ organization: m.organization.id }),
                          ),
                        )
                        .catch((error) => setItError(errorMessage(error)));
                      // The canonical boundary replaces context after activation.
                    }}
                  >
                    Switch to {m.organization.name}
                  </Btn>
                ))}
              </div>
            )}
            <Btn onClick={() => window.location.assign(config.appBaseUrl)}>
              Go to Capiro
            </Btn>
          </CenteredNotice>
        </ExtShell>
      );
    }
  }
  if (!orgId) {
    if (orgList.isLoaded && memberships.length === 0) {
      return (
        <ExtShell>
          <CenteredNotice>
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                color: "var(--ink-2)",
                lineHeight: 1.6,
              }}
            >
              No firm workspace is linked to your account yet — use the invite
              link from your email, or contact support@capiro.ai.
            </p>
          </CenteredNotice>
        </ExtShell>
      );
    }
    // More than one workspace and none active: the user must pick. Never guess
    // — the wrong pick shows another firm's setup state under this user's name.
    if (orgList.isLoaded && memberships.length > 0) {
      return (
        <ExtShell>
          <CenteredNotice>
            <p
              style={{
                margin: "0 0 16px",
                fontSize: 13.5,
                color: "var(--ink-2)",
                lineHeight: 1.6,
              }}
            >
              You&apos;re signed in as{" "}
              <b>{user?.primaryEmailAddress?.emailAddress}</b> and belong to a
              firm workspace. Choose which firm you&apos;re setting up.
            </p>
            <AttemptStatus record={activation.record} />
            {itError && <ErrorText>{itError}</ErrorText>}
            <div style={{ display: "grid", gap: 8 }}>
              {memberships.map((m) => (
                <Btn
                  key={m.organization.id}
                  variant="primary"
                  disabled={activation.locked || !orgList.setActive}
                  onClick={() => {
                    const activate = orgList.setActive;
                    if (!activate) return;
                    void activation
                      .run(`Activate ${m.organization.name}`, (guard) =>
                        guard.wait(() =>
                          activate({ organization: m.organization.id }),
                        ),
                      )
                      .catch((error) => setItError(errorMessage(error)));
                    // The canonical boundary replaces context after activation.
                  }}
                >
                  {m.organization.name}
                </Btn>
              ))}
            </div>
          </CenteredNotice>
        </ExtShell>
      );
    }
    return (
      <ExtShell>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "60px 0",
          }}
        >
          <Spinner size={18} />
        </div>
      </ExtShell>
    );
  }
  return null;
}
