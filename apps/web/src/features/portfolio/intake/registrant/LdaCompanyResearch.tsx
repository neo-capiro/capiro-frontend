"use client";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import { useApi } from "@/shared/portfolio/api/provider";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { safeWebsite } from "@/features/portfolio/index/public";
import { useIntakeAuthority } from "@/features/portfolio/client-intake/public";
import {
  ProfileBuildPanel,
  useProfileBuildRun,
  useProfileSnapshot,
  readProfile,
  savePersonProfile,
  previewProfileIdentity,
  confirmProfileIdentity,
  IdentityMatch,
  useIdentityBinding,
  type IdentitySelection,
  type IdentityPreview,
  type ProfileSnapshot,
} from "@/features/portfolio/profile-build/public";

type Props = {
  clientId: string;
  ldaClientId: number;
  name: string;
  website?: string;
};
export function LdaCompanyResearch(props: Props) {
  const subject = { kind: "client" as const, id: props.clientId };
  const run = useProfileBuildRun(subject, true);
  const profile = useProfileSnapshot(subject);
  if (run.data) return <ProfileBuildPanel subject={subject} />;
  if (!run.isSuccess || !profile.data || profile.error)
    return (
      <QueryState
        pending={run.isPending || profile.isPending}
        error={run.error ?? profile.error}
        retry={() => {
          void run.refetch();
          void profile.refetch();
        }}
      />
    );
  return <CompanyConfirmation {...props} profile={profile.data} />;
}
function CompanyConfirmation({
  clientId,
  ldaClientId,
  name,
  website: initialWebsite,
  profile,
}: Props & { profile: ProfileSnapshot }) {
  const api = useApi();
  const capture = useIntakeAuthority(false);
  const binding = useIdentityBinding();
  const [website, setWebsite] = useState(
    initialWebsite ??
      (typeof profile.fields.website === "string"
        ? profile.fields.website
        : ""),
  );
  const [preview, setPreview] = useState<IdentityPreview>();
  const [selected, setSelected] = useState<IdentitySelection>();
  const [confirmed, setConfirmed] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const owner = useRef<ReturnType<typeof capture> | undefined>(undefined);
  const identityCommand = useRef<
    | { requestId: string; expectedVersion: string; canonicalEntityId: string }
    | undefined
  >(undefined);
  const websiteCommand = useRef<
    | {
        requestId: string;
        expectedVersion: string;
        fields: { website: string };
      }
    | undefined
  >(undefined);
  const subject = { kind: "client" as const, id: clientId };
  const review = useMutation({
    retry: false,
    onError: (error) => {
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        setPreview(undefined);
        setSelected(undefined);
      }
      if (
        error instanceof ApiError &&
        [400, 403, 404, 409, 422].includes(error.status)
      ) {
        identityCommand.current = undefined;
        websiteCommand.current = undefined;
        setDispatched(false);
      }
    },
    mutationFn: async () => {
      const scope = owner.current ?? capture();
      scope.assert();
      owner.current = scope;
      if (website.trim() && !safeWebsite(website))
        throw new Error("Enter a valid company website or leave it empty.");
      if (!preview) {
        const result = await previewProfileIdentity(
          api,
          {
            name,
            ...(website.trim() ? { website: safeWebsite(website)! } : {}),
            identifiers: [
              { type: "lda_client_id", value: String(ldaClientId) },
            ],
          },
          scope.signal,
        );
        scope.assert();
        setPreview(
          result.duplicate?.kind === "client" &&
            result.duplicate.id === clientId
            ? {
                ...result,
                duplicate: null,
                status: result.entity ? "exact" : "none",
              }
            : result,
        );
        return;
      }
      if (preview.duplicate || selected === undefined)
        throw new Error("Confirm this company before starting research.");
      const canonicalEntityId = await binding.confirm(selected, scope);
      scope.assert();
      let current = await readProfile(api, subject, scope.signal);
      scope.assert();
      setDispatched(true);
      if (canonicalEntityId) {
        identityCommand.current ??= {
          requestId: crypto.randomUUID(),
          expectedVersion: current.version,
          canonicalEntityId,
        };
        current = await confirmProfileIdentity(
          api,
          subject,
          identityCommand.current,
          scope.signal,
        );
        scope.assert();
      }
      if (website.trim()) {
        websiteCommand.current ??= {
          requestId: crypto.randomUUID(),
          expectedVersion: current.version,
          fields: { website: safeWebsite(website)! },
        };
        await savePersonProfile(
          api,
          subject,
          websiteCommand.current,
          scope.signal,
        );
        scope.assert();
      }
      setConfirmed(true);
    },
  });
  if (confirmed)
    return (
      <ProfileBuildPanel
        subject={subject}
        initialResearch={{
          sources: ["public_web", "sam_gov", "lda"],
          attachmentIds: [],
          ldaClientIds: [ldaClientId],
          website: safeWebsite(website) ?? "",
        }}
      />
    );
  return (
    <section className="stack" aria-label={`Company confirmation for ${name}`}>
      <p className="chip">Needs company confirmation</p>
      <p className="muted">
        LDA filing history is saved. Confirm the company before researching
        additional sources.
      </p>
      <label>
        Company website <small className="muted">Optional</small>
        <input
          value={website}
          maxLength={500}
          disabled={review.isPending || Boolean(preview)}
          onChange={(event) => setWebsite(event.target.value)}
          placeholder="company.com"
        />
      </label>
      {preview && binding.canRead && (
        <IdentityMatch
          preview={preview}
          selected={selected}
          disabled={review.isPending || dispatched || binding.locked}
          onSelect={setSelected}
        />
      )}
      <QueryState error={review.error} />
      <div className="row">
        {preview && !dispatched && !binding.locked && (
          <button
            className="button ghost"
            disabled={review.isPending}
            onClick={() => {
              setPreview(undefined);
              setSelected(undefined);
            }}
          >
            Change company details
          </button>
        )}
        <button
          className="button primary"
          disabled={
            review.isPending ||
            Boolean(preview && (preview.duplicate || selected === undefined))
          }
          onClick={() => review.mutate()}
        >
          {review.isPending
            ? "Checking company…"
            : binding.locked
              ? "Retry company confirmation"
              : preview
                ? "Confirm company and research"
                : "Check company match"}
        </button>
      </div>
    </section>
  );
}
