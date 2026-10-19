"use client";
import { useState } from "react";
import { useClient } from "@/features/portfolio/index/public";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { ApiError } from "@/shared/portfolio/api/http";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useSaveRegistrations } from "./registration-mutations";
import { certifications } from "@/features/portfolio/client-intake/public";
import styles from "./capabilities.module.css";
import registrationStyles from "./registrations.module.css";
const tokens = (value: FormDataEntryValue | null) => [
  ...new Set(
    String(value ?? "")
      .split(/[,\n]/)
      .map((v) => v.trim())
      .filter(Boolean),
  ),
];
export function Registrations({
  clientId,
  open,
  onClose,
}: {
  clientId: string;
  open: boolean;
  onClose: () => void;
}) {
  const client = useClient(clientId);
  const identity = useIdentity();
  const [editing, setEditing] = useState(false);
  const save = useSaveRegistrations(clientId, open && editing, () =>
    setEditing(false),
  );
  const mismatch = client.isSuccess && client.data?.id !== clientId;
  const data =
    client.isSuccess && !client.error && !mismatch ? client.data : undefined;
  // A changed registration snapshot replaces uncontrolled inputs. Changes to
  // unrelated profile notes do not discard this five-field registration draft.
  const draftKey = JSON.stringify([
    data?.uei,
    data?.cageCode,
    data?.naicsCodes,
    data?.pscCodes,
    data?.setAsideCertifications,
  ]);
  const intakeValue = (key: string) => {
    const value = data?.intakeData?.[key];
    return typeof value === "string" ? value : null;
  };
  const values = [
    ["UEI", data?.uei],
    ["CAGE", data?.cageCode],
    ["EIN", intakeValue("ein")],
    ["Primary NAICS", intakeValue("primaryNaics")],
    ["NAICS codes", data?.naicsCodes?.join(", ")],
    ["PSC codes", data?.pscCodes?.join(", ")],
    ["Set-aside certifications", data?.setAsideCertifications?.join(", ")],
    ["Organization types", data?.applicantTypes?.join(", ")],
  ];
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !save.isPending) onClose();
      }}
      title="Registrations & codes"
      className={registrationStyles.dialog}
    >
      <div className={`stack ${registrationStyles.body}`}>
        <QueryState
          pending={client.isPending}
          error={
            client.error ??
            (mismatch
              ? new ApiError(
                  502,
                  "The service returned registrations for another client. Retry this client read.",
                )
              : null)
          }
          retry={() => void client.refetch()}
        />
        <QueryState
          error={identity.error}
          retry={() => void identity.refetch()}
        />
        {data &&
          (editing ? (
            <form
              key={draftKey}
              className="stack"
              onSubmit={(event) => {
                event.preventDefault();
                if (save.isPending) return;
                const form = new FormData(event.currentTarget);
                save.mutate({
                  uei: String(form.get("uei")).trim(),
                  cageCode: String(form.get("cage")).trim(),
                  naicsCodes: tokens(form.get("naics")),
                  pscCodes: tokens(form.get("psc")),
                  setAsideCertifications: form
                    .getAll("certification")
                    .map(String),
                });
              }}
            >
              <fieldset
                className={`stack ${styles.editorFields}`}
                disabled={!save.canWrite || save.isPending}
              >
                <label>
                  UEI
                  <input
                    name="uei"
                    maxLength={12}
                    defaultValue={data.uei ?? ""}
                  />
                </label>
                <label>
                  CAGE
                  <input
                    name="cage"
                    maxLength={5}
                    defaultValue={data.cageCode ?? ""}
                  />
                </label>
                <label>
                  NAICS codes (comma separated)
                  <input
                    name="naics"
                    defaultValue={data.naicsCodes?.join(", ") ?? ""}
                  />
                </label>
                <label>
                  PSC codes (comma separated)
                  <input
                    name="psc"
                    defaultValue={data.pscCodes?.join(", ") ?? ""}
                  />
                </label>
                <fieldset>
                  <legend>Held certifications</legend>
                  {data.setAsideCertifications
                    ?.filter(
                      (code) => !certifications.some((known) => known === code),
                    )
                    .map((code) => (
                      <div key={code}>
                        <input
                          type="hidden"
                          name="certification"
                          value={code}
                        />
                        <small>{code} · Existing code retained</small>
                      </div>
                    ))}
                  {certifications.map((code) => (
                    <label className="row" key={code}>
                      <input
                        type="checkbox"
                        name="certification"
                        value={code}
                        defaultChecked={data.setAsideCertifications?.includes(
                          code,
                        )}
                      />
                      {code}
                    </label>
                  ))}
                </fieldset>
                <small>
                  EIN, primary NAICS and registry details are read-only in this
                  form.
                </small>
              </fieldset>
              <QueryState error={save.error} />
              {!save.canWrite && !save.isPending && (
                <small>
                  Saving requires current client details and an administrator
                  session.
                </small>
              )}
              <div className="row">
                <button
                  className="button primary"
                  disabled={!save.canWrite || save.isPending}
                >
                  Save registrations
                </button>
                <button
                  className="button"
                  type="button"
                  disabled={save.isPending}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="stack">
              <p className="muted">
                SAM.gov: {intakeValue("samStatus") ?? "Not supplied"}
                {intakeValue("samExpirationDate") &&
                  ` · Expires ${intakeValue("samExpirationDate")}`}
              </p>
              <dl className={registrationStyles.rows}>
                {values.map(([label, value]) => (
                  <div className={registrationStyles.row} key={label}>
                    <dt className="eyebrow">{label}</dt>
                    <dd>{value || "Not supplied"}</dd>
                  </div>
                ))}
              </dl>
              {intakeValue("ein") &&
                !/^\d{9}$/.test(
                  (intakeValue("ein") ?? "").replace(/\D/g, ""),
                ) && (
                  <p role="status" className={registrationStyles.warning}>
                    EIN needs review: the saved value does not contain nine
                    digits.
                  </p>
                )}
              {save.canEdit && (
                <button className="button" onClick={() => setEditing(true)}>
                  Edit registrations
                </button>
              )}
              {!save.canEdit && (
                <small>
                  Registration edits require current client details and an
                  administrator session.
                </small>
              )}
            </div>
          ))}
      </div>
    </Dialog>
  );
}
