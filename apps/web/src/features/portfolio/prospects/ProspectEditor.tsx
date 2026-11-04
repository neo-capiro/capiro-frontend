"use client";
import { useRef, useState } from "react";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { useQueryClient } from "@tanstack/react-query";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import {
  useMemberOptions,
  memberName,
} from "@/features/portfolio/index/public";
import { useIntakeAuthority } from "@/features/portfolio/client-intake/public";
import {
  readProfile,
  savePersonProfile,
  IdentityMatch,
  useIdentityBinding,
  type IdentitySelection,
  previewProfileIdentity,
  type IdentityPreview,
  type PersonProfileInput,
  type ProfileSnapshot,
} from "@/features/portfolio/profile-build/public";
import {
  prospectInputSchema,
  prospectForIdSchema,
  prospectSchema,
  type Prospect,
  type ProspectInput,
} from "./contracts";
import { useStageCatalog, prospectBase } from "./queries";

type Props = {
  record?: Prospect;
  onClose: () => void;
  onSaved: (record: Prospect) => void;
};
export function ProspectEditor(props: Props) {
  const identity = useIdentity();
  const actor = `${identity.data?.tenant?.id}:${identity.data?.user.id}`;
  return (
    <ProspectEditorSession
      key={`${actor}:${props.record?.id ?? "new"}`}
      {...props}
    />
  );
}
function ProspectEditorSession({ record, onClose, onSaved }: Props) {
  const api = useApi();
  const cache = useQueryClient();
  const capture = useIntakeAuthority(false);
  const catalog = useStageCatalog();
  const owners = useMemberOptions();
  const [values, setValues] = useState<ProspectInput>({
    displayName: record?.displayName ?? "",
    website: record?.website ?? "",
    domain: record?.domain ?? "",
    description: record?.description ?? "",
    serviceHypothesis: record?.serviceHypothesis ?? "",
    geography: record?.geography ?? "",
  });
  const [owner, setOwner] = useState(record?.ownerUserId ?? "");
  const [validation, setValidation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error>();
  const [uncertain, setUncertain] = useState(false);
  const [saved, setSaved] = useState<Prospect>();
  const [profileRefused, setProfileRefused] = useState(false);
  const [profileReview, setProfileReview] = useState<{
    current: ProfileSnapshot;
    changes: PersonProfileInput["fields"];
  }>();
  const [match, setMatch] = useState<IdentityPreview>();
  const [identitySelection, setIdentitySelection] =
    useState<IdentitySelection>();
  const binding = useIdentityBinding();
  const command = useRef<
    | (PersonProfileInput & { requestId: string; expectedVersion: string })
    | undefined
  >(undefined);
  const scope = useRef<ReturnType<typeof capture> | undefined>(undefined);
  const set = (key: keyof ProspectInput, value: string) => {
    if (["displayName", "website"].includes(key)) {
      setMatch(undefined);
      setIdentitySelection(undefined);
    }
    setValues((current) => ({ ...current, [key]: value }));
  };
  async function reviewCurrentProfile() {
    if (busy || !saved || !profileRefused) return;
    setBusy(true);
    setError(undefined);
    setProfileReview(undefined);
    try {
      const authority = scope.current ?? capture();
      authority.assert();
      const latest = await readProfile(
        api,
        { kind: "prospect", id: saved.id },
        authority.signal,
      );
      authority.assert();
      setProfileReview({ current: latest, changes: command.current?.fields });
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure
          : new Error("Current profile details could not be read."),
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (busy || uncertain || (!record && !catalog.data)) return;
    if (profileRefused && !profileReview) return;
    if (
      values.description.length > 600 &&
      values.description !== record?.description
    ) {
      setValidation("Company description is limited to 600 characters.");
      return;
    }
    const parsed = prospectInputSchema.safeParse(values);
    if (!parsed.success) {
      setValidation(
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
      return;
    }
    setBusy(true);
    setError(undefined);
    setValidation("");
    try {
      const authority = scope.current ?? capture();
      authority.assert();
      scope.current = authority;
      if (!record && !saved && !match) {
        const preview = await previewProfileIdentity(
          api,
          {
            name: values.displayName,
            ...(values.website ? { website: values.website } : {}),
          },
          authority.signal,
        );
        authority.assert();
        setMatch(preview);
        return;
      }
      if (
        !record &&
        !saved &&
        (match?.duplicate || identitySelection === undefined)
      )
        throw new Error(
          "Confirm the company identity before creating a prospect.",
        );
      let receipt = saved;
      if (!receipt) {
        const canonicalEntityId = !record
          ? await binding.confirm(identitySelection, authority)
          : undefined;
        authority.assert();
        try {
          receipt = await api.request(
            "core",
            record ? `${prospectBase}/${record.id}` : prospectBase,
            record ? prospectForIdSchema(record.id) : prospectSchema,
            {
              method: record ? "PATCH" : "POST",
              signal: authority.signal,
              body: {
                ...parsed.data,
                ownerUserId: owner || null,
                ...(!record
                  ? {
                      stage: catalog.data!.createStage,
                      ...(canonicalEntityId ? { canonicalEntityId } : {}),
                    }
                  : {}),
              },
            },
          );
        } catch (failure) {
          if (
            !record &&
            (!(failure instanceof ApiError) ||
              ![400, 401, 403, 404, 409, 422].includes(failure.status))
          )
            setUncertain(true);
          throw failure;
        }
        authority.assert();
        setSaved(receipt);
        await cache.invalidateQueries({ queryKey: ["prospects"] });
        await cache.invalidateQueries({ queryKey: ["prospect", receipt.id] });
      }
      const subject = { kind: "prospect" as const, id: receipt.id };
      if (profileRefused && profileReview && command.current) {
        // Only this explicit save adopts the reviewed version and a new command.
        command.current = {
          ...command.current,
          requestId: crypto.randomUUID(),
          expectedVersion: profileReview.current.version,
        };
        setProfileRefused(false);
        setProfileReview(undefined);
      }
      if (!command.current) {
        const latest = await readProfile(api, subject, authority.signal);
        authority.assert();
        command.current = {
          fields: {
            ...(!record || values.displayName !== record.displayName
              ? { name: values.displayName }
              : {}),
            ...(!record || values.website !== (record.website ?? "")
              ? { website: values.website }
              : {}),
            ...(!record || values.description !== (record.description ?? "")
              ? { description: values.description }
              : {}),
          },
          requestId: crypto.randomUUID(),
          expectedVersion: latest.version,
        };
      }
      authority.assert();
      try {
        await savePersonProfile(
          api,
          subject,
          command.current,
          authority.signal,
        );
      } catch (failure) {
        if (failure instanceof ApiError && failure.status === 409) {
          authority.assert();
          setProfileRefused(true);
          setProfileReview(undefined);
        }
        throw failure;
      }
      authority.assert();
      await cache.invalidateQueries({
        queryKey: ["profile-build", "prospect", receipt.id],
      });
      authority.assert();
      onSaved(receipt);
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        [401, 403, 404].includes(failure.status)
      ) {
        setMatch(undefined);
        setIdentitySelection(undefined);
        setProfileReview(undefined);
      }
      setError(
        failure instanceof Error
          ? failure
          : new Error("The prospect could not be saved."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      title={record ? "Edit company details" : "Add prospect"}
      description="Track a potential client in Business Development. Only company name is required."
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <fieldset
          disabled={busy || Boolean(saved) || binding.locked}
          className="stack"
        >
          <label>
            Company name *
            <input
              name="displayName"
              required
              maxLength={200}
              value={values.displayName}
              onChange={(event) => set("displayName", event.target.value)}
              autoFocus
            />
          </label>
          <label>
            Website
            <input
              name="website"
              maxLength={500}
              value={values.website}
              onChange={(event) => set("website", event.target.value)}
            />
            <small className="muted">
              A website helps match the right company and carries over when they
              become a client.
            </small>
          </label>
          <TextareaField
            label="Description"
            name="description"
            maxLength={600}
            value={values.description}
            onChange={(event) => set("description", event.target.value)}
          />
          <TextareaField
            label="Service hypothesis"
            name="serviceHypothesis"
            maxLength={4000}
            value={values.serviceHypothesis}
            onChange={(event) => set("serviceHypothesis", event.target.value)}
          />
          <label>
            Geography
            <input
              name="geography"
              maxLength={200}
              value={values.geography}
              onChange={(event) => set("geography", event.target.value)}
            />
          </label>
          <label>
            Owner
            <select
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
            >
              <option value="">Unassigned</option>
              {owners.data?.map((member) => (
                <option key={member.id} value={member.id}>
                  {memberName(member)}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        {match && !saved && binding.canRead && (
          <IdentityMatch
            preview={match}
            selected={identitySelection}
            onSelect={setIdentitySelection}
            disabled={busy || binding.locked}
          />
        )}
        {validation && <p role="alert">{validation}</p>}
        <QueryState error={error ?? (!record ? catalog.error : undefined)} />
        {uncertain && (
          <p role="alert">
            Creation could not be confirmed. Review the prospect list before
            creating another record.
          </p>
        )}
        {saved && error && !profileRefused && (
          <p role="status">
            The prospect was saved. Retry to finish its profile using the same
            saved record.
          </p>
        )}
        {saved && profileRefused && (
          <section
            className="stack"
            aria-label="Review current profile details"
          >
            <p role="status">
              The prospect was saved, but its profile changed before your
              details could be applied. Review the current details before saving
              again.
            </p>
            {profileReview && (
              <dl>
                {Object.entries(profileReview.changes ?? {}).map(
                  ([field, value]) => (
                    <div key={field}>
                      <dt>{field}</dt>
                      <dd>
                        Current:{" "}
                        {String(
                          profileReview.current.fields[field] ?? "Not provided",
                        )}
                      </dd>
                      <dd>
                        Your saved change: {String(value ?? "Not provided")}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            )}
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => void reviewCurrentProfile()}
            >
              {profileReview
                ? "Refresh current profile details"
                : "Review current profile details"}
            </button>
          </section>
        )}
        <footer className="row">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={
              busy ||
              uncertain ||
              (profileRefused && !profileReview) ||
              (!record && !catalog.data)
            }
          >
            {busy
              ? "Saving…"
              : profileRefused
                ? "Save reviewed profile details"
                : binding.locked
                  ? "Retry company confirmation"
                  : saved
                    ? "Retry profile details"
                    : record
                      ? "Save company details"
                      : "Create prospect"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
