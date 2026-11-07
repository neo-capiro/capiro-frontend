"use client";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { useIdentity, canAdminister } from "@/shared/portfolio/auth/identity";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useIntakeAuthority } from "@/features/portfolio/client-intake/public";
import { verifyProfileCapacity } from "@/features/portfolio/billing/public";
import {
  canResearchFile,
  useProfileSnapshot,
  IdentityMatch,
  useIdentityBinding,
  type IdentitySelection,
  previewProfileIdentity,
  identitySelectionName,
  ProfileBuildPanel,
  type IdentityPreview,
  type ResearchInput,
} from "@/features/portfolio/profile-build/public";
import {
  attachmentSchema,
  fileValidation,
  useProfileIdentityDocument,
  ProfileIdentityDocumentState,
  linkProfileIdentityDocument,
  type Attachment,
} from "@/features/portfolio/files/public";
import { clientSchema, type Client } from "./contracts";
import { safeWebsite } from "./contracts";
import { clientsKey } from "./queries";

export function SourcedProfileStart({ allowed }: { allowed: boolean }) {
  const identity = useIdentity();
  const actor = `${identity.data?.tenant?.id}:${identity.data?.user.id}`;
  const active =
    identity.isSuccess &&
    !identity.isFetching &&
    !identity.error &&
    Boolean(identity.data?.tenant?.id) &&
    (identity.data?.role === "standard_user" ||
      canAdminister(identity.data?.role));
  return (
    <CurrentSourcedProfileStart
      key={actor}
      actor={actor}
      allowed={allowed}
      active={active}
      checking={identity.isPending || identity.isFetching}
      refreshIdentity={() => identity.refetch({ throwOnError: true })}
    />
  );
}
function CurrentSourcedProfileStart({
  allowed,
  actor,
  active,
  checking,
  refreshIdentity,
}: {
  allowed: boolean;
  actor: string;
  active: boolean;
  checking: boolean;
  refreshIdentity: () => Promise<unknown>;
}) {
  const api = useApi();
  const capture = useIntakeAuthority(false);
  const binding = useIdentityBinding();
  const cache = useQueryClient();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [file, setFile] = useState<File>();
  const [validation, setValidation] = useState("");
  const [preview, setPreview] = useState<IdentityPreview>();
  const [selected, setSelected] = useState<IdentitySelection>();
  const [saved, setSaved] = useState<Client>();
  const [prepared, setPrepared] = useState<Attachment>();
  const [uploaded, setUploaded] = useState<Attachment>();
  const [shareDocument, setShareDocument] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [initialResearchPending, setInitialResearchPending] = useState(true);
  const owner = useRef<ReturnType<typeof capture> | undefined>(undefined);
  const identityDocument = useProfileIdentityDocument({
    file,
    active: active && !saved,
    capture,
  });
  const mutation = useMutation({
    retry: false,
    onError: (error) => {
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        setPreview(undefined);
        setSelected(undefined);
      }
    },
    mutationFn: async () => {
      const scope = owner.current ?? capture();
      scope.assert();
      owner.current = scope;
      if (!saved && !preview) {
        const readyDocument = file
          ? await identityDocument.ensureReady()
          : undefined;
        scope.assert();
        setPrepared(readyDocument);
        const match = await previewProfileIdentity(
          api,
          {
            ...(name.trim() ? { name: name.trim() } : {}),
            ...(readyDocument ? { attachmentId: readyDocument.id } : {}),
            ...(website.trim() ? { website: website.trim() } : {}),
          },
          scope.signal,
        );
        scope.assert();
        setPreview(match);
        return;
      }
      if (!saved && (selected === undefined || preview?.duplicate))
        throw new Error("Confirm a company before continuing.");
      let client = saved;
      if (!client) {
        const createName =
          name.trim() || (preview && identitySelectionName(preview, selected));
        if (!createName)
          throw new Error(
            "Choose a sourced company or enter its legal name before creating a profile.",
          );
        await verifyProfileCapacity(api, 1, scope.assert, scope.signal);
        scope.assert();
        const canonicalEntityId = await binding.confirm(selected, scope);
        scope.assert();
        try {
          client = await api.request("core", "clients", clientSchema, {
            method: "POST",
            body: {
              name: createName,
              ...(website.trim() ? { website: website.trim() } : {}),
              ...(canonicalEntityId ? { canonicalEntityId } : {}),
              profileType: "CLIENT",
              profileStatus: "ACTIVE",
            },
            signal: scope.signal,
          });
        } catch (error) {
          if (
            !(error instanceof ApiError) ||
            ![400, 401, 402, 403, 404, 409, 422].includes(error.status)
          )
            setUncertain(true);
          throw error;
        }
        // A validated POST receipt is already a confirmed creation. Preserve
        // it before rechecking authority so a refresh failure cannot enable a
        // second create. The actor-keyed component still owns its lifetime.
        setSaved(client);
      }
      // Creation and background enrichment change Core's native membership
      // snapshot. Continue only after a fresh authoritative read for this actor.
      await refreshIdentity();
      scope.assert();
      await cache.invalidateQueries({ queryKey: clientsKey });
      scope.assert();
      if (file && !uploaded) {
        if (!prepared)
          throw new Error(
            "The original identity document could not be confirmed. Open the saved profile to review its files.",
          );
        const receipt = await linkProfileIdentityDocument(
          api,
          prepared.id,
          { kind: "client", id: client.id },
          scope,
          shareDocument,
        );
        scope.assert();
        setUploaded(receipt);
      }
    },
  });
  const extraction = useQuery({
    queryKey: ["profile-start-document", actor, saved?.id, uploaded?.id],
    enabled: active && shareDocument && Boolean(saved && uploaded),
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `engagement/attachments?clientId=${encodeURIComponent(saved!.id)}`,
        attachmentSchema
          .array()
          .refine((rows) => rows.every((row) => row.clientId === saved!.id)),
        { signal },
      ),
    refetchInterval: (query) =>
      query.state.data?.some(
        (row) =>
          row.id === uploaded?.id &&
          ["extracted", "truncated", "failed", "unsupported", "empty"].includes(
            row.extractionStatus ?? "",
          ),
      )
        ? false
        : 2000,
  });
  const document =
    active && extraction.isSuccess && !extraction.error
      ? extraction.data?.find((row) => row.id === uploaded?.id)
      : undefined;
  const ready =
    shareDocument &&
    document &&
    document.viewerMode === "all" &&
    saved &&
    canResearchFile(document, { kind: "client", id: saved.id });
  const researchWebsite = safeWebsite(website.trim()) ?? "";
  const initialResearch: ResearchInput = {
    sources: !file || researchWebsite ? ["public_web", "sam_gov", "lda"] : [],
    attachmentIds: ready ? [document.id] : [],
    ldaClientIds: [],
    website: researchWebsite,
  };
  const extractionFailed =
    Boolean(file) &&
    ["failed", "unsupported", "empty"].includes(
      document?.extractionStatus ?? "",
    );
  if (!active)
    return (
      <p role="status">
        {checking
          ? "Checking the current profile session…"
          : "The current session cannot continue this profile."}
      </p>
    );
  if (saved)
    return (
      <SavedProfileAccess
        id={saved.id}
        busy={mutation.isPending}
        researchPending={
          initialResearchPending &&
          !mutation.error &&
          !extraction.error &&
          !extractionFailed
        }
      >
        <div className="stack">
          <p role="status">
            {saved.name} is saved.{" "}
            {mutation.isPending
              ? "Verifying access before continuing."
              : mutation.error
                ? "Continue below after access is verified."
                : file && !uploaded
                  ? "Linking the original private document to this profile."
                  : file && !shareDocument
                    ? "The identity document remains private to you."
                    : file && !ready
                      ? "Waiting for the shared document to be extracted."
                      : "Research continues with saved progress."}
          </p>
          <QueryState error={mutation.error ?? extraction.error} />
          {mutation.isError && (
            <button
              className="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {file ? "Retry linking document" : "Continue saved profile"}
            </button>
          )}
          {extractionFailed && (
            <p role="alert">
              The document has no usable extracted text. The profile is saved;
              review its files or choose other sources.
            </p>
          )}
          {file && uploaded && !shareDocument && (
            <p className="muted">
              The document was used only to confirm company identity. Review its
              sharing in Files before using it as a shared research source.
            </p>
          )}
          {!mutation.isPending &&
            !mutation.error &&
            (!file || (uploaded && !shareDocument) || ready) && (
              <ProfileBuildPanel
                subject={{ kind: "client", id: saved.id }}
                initialResearch={
                  !file || ready || researchWebsite
                    ? initialResearch
                    : undefined
                }
                onInitialResearchPendingChange={setInitialResearchPending}
              />
            )}
        </div>
      </SavedProfileAccess>
    );
  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        setValidation("");
        if (!name.trim() && !website.trim() && !file) {
          setValidation("Enter a company name, website or document.");
          return;
        }
        if (website.trim() && !safeWebsite(website.trim())) {
          setValidation("Enter a valid website.");
          return;
        }
        mutation.mutate();
      }}
    >
      <label>
        Company name
        <input
          required={!file && !website.trim()}
          maxLength={200}
          value={name}
          disabled={Boolean(preview) || mutation.isPending}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        Website <small className="muted">Optional</small>
        <input
          maxLength={500}
          placeholder="company.com"
          value={website}
          disabled={Boolean(preview) || mutation.isPending}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </label>
      <label>
        Supporting document{" "}
        <small className="muted">Optional · PDF, DOCX or text</small>
        <input
          type="file"
          disabled={Boolean(preview) || mutation.isPending}
          onChange={(event) => {
            const next = event.target.files?.[0];
            const issue = next ? fileValidation(next) : undefined;
            setValidation(issue ?? "");
            setFile(issue ? undefined : next);
            setPrepared(undefined);
            setShareDocument(false);
          }}
        />
      </label>
      {file && (
        <>
          <label className="row">
            <input
              type="checkbox"
              checked={shareDocument}
              disabled={Boolean(preview) || mutation.isPending}
              onChange={(event) => setShareDocument(event.target.checked)}
            />
            Share this document with people who can access the profile for
            research
          </label>
          <ProfileIdentityDocumentState document={identityDocument} />
        </>
      )}
      {preview && (!file || identityDocument.ready) && (
        <IdentityMatch
          preview={preview}
          selected={selected}
          onSelect={setSelected}
          disabled={mutation.isPending || binding.locked}
          allowSeparate={Boolean(name.trim())}
        />
      )}
      {preview && !uncertain && (
        <button
          type="button"
          className="button ghost"
          disabled={mutation.isPending || binding.locked}
          onClick={() => {
            setPreview(undefined);
            setSelected(undefined);
          }}
        >
          Edit company details
        </button>
      )}
      {validation && (
        <p role="alert" className="danger">
          {validation}
        </p>
      )}
      <QueryState error={mutation.error} />
      {uncertain && (
        <p role="alert">
          Creation could not be confirmed. Review the client list before
          creating another profile.
        </p>
      )}
      <button
        className="button primary"
        disabled={
          !allowed ||
          mutation.isPending ||
          uncertain ||
          Boolean(
            preview && file && !identityDocument.ready && !binding.locked,
          ) ||
          Boolean(preview && (preview.duplicate || selected === undefined))
        }
      >
        {mutation.isPending
          ? "Working…"
          : binding.locked
            ? "Retry company confirmation"
            : preview
              ? "Build profile"
              : "Continue"}
      </button>
      <small className="muted">
        {file
          ? "The document uploads privately before company matching. Sharing is optional; shared documents can be used for profile research after you confirm the company. If you add a website, research also uses it and official SAM.gov and LDA records."
          : "Research uses the company website and official SAM.gov and LDA records. Review proposed facts before approving them."}
      </small>
    </form>
  );
}

function SavedProfileAccess({
  id,
  busy,
  researchPending,
  children,
}: {
  id: string;
  busy: boolean;
  researchPending: boolean;
  children: ReactNode;
}) {
  const profile = useProfileSnapshot({ kind: "client", id });
  const denied =
    profile.error instanceof ApiError &&
    [401, 403, 404].includes(profile.error.status);
  const pending =
    busy ||
    profile.isFetching ||
    (!profile.error && (profile.isPending || researchPending));
  return (
    <div className="stack">
      {!denied && (
        <>
          <p role="status">The profile was created.</p>
          {pending ? (
            <button className="button primary" disabled>
              Open profile
            </button>
          ) : (
            <Link className="button primary" href={`/portfolio/${id}`}>
              Open profile
            </Link>
          )}
        </>
      )}
      {profile.data && !profile.error ? (
        children
      ) : (
        <QueryState
          pending={profile.isPending}
          error={profile.error}
          retry={() => void profile.refetch()}
        />
      )}
    </div>
  );
}
