"use client";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import { useApi } from "@/shared/portfolio/api/provider";
import {
  refreshAppliedSurfaces,
  IdentityMatch,
  useIdentityBinding,
  type IdentitySelection,
  previewProfileIdentity,
  type IdentityPreview,
  readProfile,
  savePersonProfile,
  useProfileSnapshot,
  type ProfileSnapshot,
  type PersonProfileInput,
  type RegistrationCodeField,
  type CodeSuggestion,
  type AcceptedCodeEvidence,
} from "@/features/portfolio/profile-build/public";
import { personProfileInput, profileToIntake } from "./person-profile";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { canAdminister, useIdentity } from "@/shared/portfolio/auth/identity";
import { initials, type Client } from "@/features/portfolio/index/public";
import {
  clientToIntake,
  stepFields,
  validateIntake,
  type IntakeField,
  type IntakeForm,
} from "./form";
import { CompanyStep } from "./CompanyStep";
import { RegistrationStep } from "./RegistrationStep";
import { SectorStep } from "./SectorStep";
import {
  SitesStep,
  LeadershipStep,
  ManualCapabilitiesStep,
} from "./ManualSectionSteps";
import { useSaveIntake, useUploadLogo } from "./mutations";
import { ClientProfileAttemptError } from "./profile-api";
import { useIntakeAuthority, type IntakeWriteScope } from "./authority";
import {
  verifyProfileCapacity,
  ProfileCapacityStatus,
  useProfileCapacity,
} from "@/features/portfolio/billing/public";
import { validateLogo, type LogoAttempt } from "./logo";
import styles from "./intake.module.css";

export interface ClientIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
  onSaved: (client: Client) => void;
  onCloseAutoFocus?: ComponentProps<typeof Dialog>["onCloseAutoFocus"];
}
export function ClientIntakeDialog(props: ClientIntakeDialogProps) {
  const identity = useIdentity();
  const actor = `${identity.data?.tenant?.id}:${identity.data?.user.id}`;
  return props.open ? (
    props.client ? (
      <LoadIntake
        key={`${actor}:${props.client.id}`}
        {...props}
        client={props.client}
      />
    ) : (
      <IntakeSession key={actor} {...props} />
    )
  ) : null;
}
function LoadIntake(props: ClientIntakeDialogProps & { client: Client }) {
  const profile = useProfileSnapshot({ kind: "client", id: props.client.id });
  if (!profile.data || profile.error)
    return (
      <Dialog
        open={props.open}
        onOpenChange={props.onOpenChange}
        title="Edit client details"
      >
        <QueryState
          pending={profile.isPending}
          error={profile.error}
          retry={() => void profile.refetch()}
        />
      </Dialog>
    );
  return <IntakeSession {...props} profile={profile.data} />;
}
function IntakeSession({
  open,
  onOpenChange,
  client,
  onSaved,
  onCloseAutoFocus,
  profile,
}: ClientIntakeDialogProps & { profile?: ProfileSnapshot }) {
  const identity = useIdentity();
  const api = useApi();
  const cache = useQueryClient();
  const [initial, setInitial] = useState(() =>
    profile
      ? profileToIntake(clientToIntake(client), profile)
      : clientToIntake(client),
  );
  const personAttempt = useRef<
    | (PersonProfileInput & { requestId: string; expectedVersion: string })
    | undefined
  >(undefined);
  const [savingFacts, setSavingFacts] = useState(false);
  const [detailsRefusal, setDetailsRefusal] = useState<number>();
  const [editingRejected, setEditingRejected] = useState(false);
  const [match, setMatch] = useState<IdentityPreview>();
  const [identitySelection, setIdentitySelection] =
    useState<IdentitySelection>();
  const binding = useIdentityBinding();
  const [values, setValues] = useState(initial);
  const [codeEvidence, setCodeEvidence] = useState<AcceptedCodeEvidence>({});
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<IntakeField, string>>>(
    {},
  );
  const [logo, setLogo] = useState<LogoAttempt>();
  const [logoValidation, setLogoValidation] = useState("");
  const [failedLogoUrl, setFailedLogoUrl] = useState<string>();
  const [persisted, setPersisted] = useState<Client>();
  const persistedScope = useRef<IntakeWriteScope | undefined>(undefined);
  const [continuationError, setContinuationError] = useState<Error>();
  const fields = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    if (Object.keys(errors).length)
      fields.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
  }, [errors]);
  const capture = useIntakeAuthority(Boolean(client));
  const save = useSaveIntake(capture, client);
  const capacity = useProfileCapacity(!client && !persisted);
  const upload = useUploadLogo(capture);
  const pending = save.isPending || upload.isPending || savingFacts;
  const uncertainCreation =
    !client &&
    ((save.error instanceof ClientProfileAttemptError &&
      save.error.uncertain) ||
      (continuationError instanceof ClientProfileAttemptError &&
        continuationError.uncertain));
  const role = identity.data?.role;
  const permitted = client
    ? canAdminister(role)
    : role === "standard_user" || canAdminister(role);
  const set = <K extends IntakeField>(key: K, value: IntakeForm[K]) => {
    if (["name", "website", "uei", "cageCode"].includes(key)) {
      setMatch(undefined);
      setIdentitySelection(undefined);
    }
    setValues((current) => ({ ...current, [key]: value }));
  };
  const finish = (saved: Client) => {
    persistedScope.current?.assert();
    onSaved(saved);
    onOpenChange(false);
  };
  const close = () => {
    if (pending) return;
    if (persisted) {
      try {
        finish(persisted);
      } catch (error) {
        setContinuationError(
          error instanceof Error
            ? error
            : new Error("Your profile session changed."),
        );
      }
    } else onOpenChange(false);
  };
  function validate(targetStep?: number) {
    const next = validateIntake(values, client ? initial : undefined);
    const relevant =
      targetStep === undefined
        ? next
        : Object.fromEntries(
            Object.entries(next).filter(([key]) =>
              stepFields[targetStep]?.includes(key as IntakeField),
            ),
          );
    setErrors(relevant);
    const first = Object.keys(relevant)[0] as IntakeField | undefined;
    if (first)
      setStep(stepFields.findIndex((fields) => fields.includes(first)));
    return !first;
  }
  async function submit() {
    if (
      pending ||
      uncertainCreation ||
      !permitted ||
      (!client && !persisted && !capacity.allowed) ||
      !validate()
    )
      return;
    try {
      setContinuationError(undefined);
      setSavingFacts(true);
      const scope = persistedScope.current ?? capture();
      scope.assert();
      if (!client && !persisted) {
        if (!match) {
          try {
            await verifyProfileCapacity(api, 1, scope.assert, scope.signal);
          } catch (error) {
            scope.assert();
            await capacity.query.refetch();
            scope.assert();
            throw error;
          }
          scope.assert();
          const result = await previewProfileIdentity(
            api,
            {
              name: values.name.trim(),
              ...(values.website ? { website: values.website } : {}),
              identifiers: [
                ...(values.uei ? [{ type: "uei", value: values.uei }] : []),
                ...(values.cageCode
                  ? [{ type: "cage", value: values.cageCode }]
                  : []),
              ],
            },
            scope.signal,
          );
          scope.assert();
          setMatch(result);
          return;
        }
        if (match.duplicate || identitySelection === undefined)
          throw new Error("Confirm the company match before saving.");
      }
      const canonicalEntityId =
        !client && !persisted
          ? await binding.confirm(identitySelection, scope)
          : undefined;
      scope.assert();
      const saved =
        persisted ??
        (await save.mutateAsync({
          values,
          initial: client ? initial : undefined,
          canonicalEntityId: canonicalEntityId ?? undefined,
        }));
      try {
        scope.assert();
      } catch {
        throw new ClientProfileAttemptError(
          "Your profile session changed after saving. Review the client list before continuing.",
          true,
        );
      }
      persistedScope.current = scope;
      setPersisted(saved);
      const subject = { kind: "client" as const, id: saved.id };
      if (!personAttempt.current) {
        const latest = await readProfile(api, subject, scope.signal);
        scope.assert();
        personAttempt.current = {
          ...personProfileInput(
            values,
            client ? initial : undefined,
            codeEvidence,
          ),
          requestId: crypto.randomUUID(),
          expectedVersion: latest.version,
        };
      }
      scope.assert();
      setEditingRejected(false);
      setDetailsRefusal(undefined);
      try {
        await savePersonProfile(
          api,
          subject,
          personAttempt.current,
          scope.signal,
        );
      } catch (error) {
        if (error instanceof ApiError && [400, 409, 422].includes(error.status))
          setDetailsRefusal(error.status);
        throw error;
      }
      setDetailsRefusal(undefined);
      setEditingRejected(false);
      await refreshAppliedSurfaces(cache, subject);
      scope.assert();
      finish(
        logo
          ? await upload.mutateAsync({ clientId: saved.id, attempt: logo })
          : saved,
      );
    } catch (error) {
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        setMatch(undefined);
        setIdentitySelection(undefined);
      }
      setContinuationError(
        error instanceof Error
          ? error
          : new Error("The profile could not be confirmed."),
      );
      /* Retain the created client and exact command for safe retry. */
    } finally {
      setSavingFacts(false);
    }
  }
  async function reviseRejectedDetails() {
    if (!persisted || !detailsRefusal || pending) return;
    setSavingFacts(true);
    try {
      const scope = persistedScope.current!;
      scope.assert();
      const latest = await readProfile(
        api,
        { kind: "client", id: persisted.id },
        scope.signal,
      );
      scope.assert();
      if (detailsRefusal === 409) {
        const current = profileToIntake(clientToIntake(persisted), latest);
        setInitial(current);
        setValues(current);
      }
      personAttempt.current = undefined;
      setDetailsRefusal(undefined);
      setContinuationError(undefined);
      setEditingRejected(true);
      setStep(0);
    } catch (error) {
      setContinuationError(
        error instanceof Error
          ? error
          : new Error("The current profile could not be loaded."),
      );
    } finally {
      setSavingFacts(false);
    }
  }
  const frozen = (Boolean(persisted) && !editingRejected) || binding.locked;
  const onAcceptCode = (
    field: RegistrationCodeField,
    suggestion: CodeSuggestion,
  ) => {
    capture().assert();
    if (field === "uei" || field === "cageCode") set(field, suggestion.code);
    else set(field, [...new Set([...values[field], suggestion.code])]);
    setCodeEvidence((current) => ({
      ...current,
      [field]: [
        ...(current[field] ?? []).filter(
          (item) => item.code !== suggestion.code,
        ),
        { code: suggestion.code, evidence: suggestion.evidence },
      ],
    }));
  };
  const suggestionId = persisted?.id ?? client?.id;
  const stepProps = {
    values,
    set,
    errors,
    onAcceptCode,
    ...(suggestionId
      ? { suggestionSubject: { kind: "client" as const, id: suggestionId } }
      : {}),
  };
  // M1: app-relative logo path from Core; not a website, so no URL resolution.
  const logoUrl = client?.logoUrl ?? undefined;
  return (
    <Dialog
      open={open}
      onCloseAutoFocus={onCloseAutoFocus}
      onOpenChange={(value) => {
        if (!value) close();
      }}
      title={client ? "Edit client details" : "Add profile"}
      description={
        client?.name ??
        "Only company name is required. Complete the rest now or later."
      }
      className={styles.dialog}
    >
      <QueryState
        pending={identity.isPending}
        error={identity.error}
        retry={() => void identity.refetch()}
      />
      {identity.data && !permitted && (
        <p role="alert">
          {client
            ? "Client edits require an administrator."
            : "Your role cannot create client profiles."}
        </p>
      )}
      {!client && !persisted && permitted && (
        <ProfileCapacityStatus capacity={capacity} />
      )}
      {match && !persisted && binding.canRead && (
        <IdentityMatch
          preview={match}
          selected={identitySelection}
          onSelect={setIdentitySelection}
          disabled={pending || binding.locked}
        />
      )}
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (step < 5 && !frozen) {
            if (validate(step)) setStep(step + 1);
          } else void submit();
        }}
      >
        <nav className={styles.steps} aria-label="Client intake steps">
          {[
            "1. Company",
            "2. Registration",
            "3. Sites",
            "4. Leadership",
            "5. Capabilities",
            "6. Advocacy profile",
          ].map((label, index) => (
            <button
              type="button"
              key={label}
              className={`button ${step === index ? "primary" : "ghost"}`}
              aria-current={step === index ? "step" : undefined}
              disabled={pending || frozen}
              onClick={() => {
                setErrors({});
                setStep(index);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <fieldset
          ref={fields}
          className={styles.scroll}
          disabled={pending || !permitted || frozen}
        >
          <div className={styles.logo}>
            <span className={styles.initials}>
              {logoUrl && failedLogoUrl !== logoUrl ? (
                // Session-authenticated app logo route; no optimizer proxy or inline SVG.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.logoImage}
                  src={logoUrl}
                  alt="Current client logo"
                  onError={() => setFailedLogoUrl(logoUrl)}
                />
              ) : (
                initials(values.name || "Client")
              )}
            </span>
            <div>
              <strong>Company logo</strong>
              <small className="muted">
                PNG, JPEG, SVG or WebP · Up to 2 MB
              </small>
              {logo && <small>{logo.file.name}</small>}
            </div>
            <label className="button">
              Upload logo
              <input
                className="srOnly"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                aria-label="Upload logo"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const invalid = validateLogo(file);
                  setLogoValidation(invalid ?? "");
                  if (!invalid) {
                    setLogo({ file });
                    upload.reset();
                  }
                  event.target.value = "";
                }}
              />
            </label>
            {logo && (
              <button
                className="button ghost"
                type="button"
                onClick={() => {
                  setLogo(undefined);
                  setLogoValidation("");
                }}
              >
                Remove selected logo
              </button>
            )}
          </div>
          {logoValidation && (
            <p role="alert" className="danger">
              {logoValidation}
            </p>
          )}
          {step === 0 ? (
            <CompanyStep {...stepProps} />
          ) : step === 1 ? (
            <RegistrationStep {...stepProps} />
          ) : step === 2 ? (
            <SitesStep {...stepProps} />
          ) : step === 3 ? (
            <LeadershipStep {...stepProps} />
          ) : step === 4 ? (
            <ManualCapabilitiesStep {...stepProps} />
          ) : (
            <SectorStep {...stepProps} />
          )}
        </fieldset>
        <div className={styles.feedback} aria-live="polite">
          {Object.keys(errors).length > 0 && (
            <p role="alert" className="danger">
              Check the highlighted fields before continuing.
            </p>
          )}
          <QueryState error={save.error ?? upload.error ?? continuationError} />
          {uncertainCreation && (
            <p role="alert">
              Profile creation could not be confirmed. Review the client list
              before starting another profile. No automatic retry will be sent.
            </p>
          )}
          {persisted && detailsRefusal && (
            <div className="stack" role="status">
              <p>
                The profile exists, but these details were not accepted.{" "}
                {detailsRefusal === 409
                  ? "Reload the current saved details before making a new decision."
                  : "Correct the rejected details and save them to this same profile."}
              </p>
              <button
                type="button"
                className="button"
                disabled={pending || !permitted}
                onClick={() => void reviseRejectedDetails()}
              >
                {detailsRefusal === 409
                  ? "Reload current details to review"
                  : "Edit rejected details"}
              </button>
            </div>
          )}
          {persisted && upload.error && (
            <p role="status">
              The profile was saved. Its logo is not confirmed. Retry the logo
              or continue to the profile.
            </p>
          )}
        </div>
        <footer className={styles.actions}>
          <button
            className="button ghost"
            type="button"
            disabled={pending}
            onClick={close}
          >
            {persisted ? "Continue to profile" : "Cancel"}
          </button>
          <span />
          {!frozen && step < 5 && (
            <button
              type="button"
              className="button"
              disabled={
                pending ||
                !permitted ||
                (!client && !persisted && !capacity.allowed)
              }
              onClick={() => void submit()}
            >
              Save profile
            </button>
          )}
          {step > 0 && !frozen && (
            <button
              className="button"
              type="button"
              disabled={pending}
              onClick={() => {
                setErrors({});
                setStep(step - 1);
              }}
            >
              Back
            </button>
          )}
          <button
            className="button primary"
            disabled={
              pending ||
              !permitted ||
              uncertainCreation ||
              (!client && !persisted && !capacity.allowed)
            }
          >
            {pending
              ? upload.isPending
                ? "Uploading logo…"
                : "Saving…"
              : binding.locked
                ? "Retry company confirmation"
                : editingRejected
                  ? step < 5
                    ? "Next"
                    : "Save corrected details"
                  : persisted
                    ? upload.error
                      ? "Retry logo"
                      : "Retry profile details"
                    : step < 5
                      ? "Next"
                      : client
                        ? "Save changes"
                        : "Create profile"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
