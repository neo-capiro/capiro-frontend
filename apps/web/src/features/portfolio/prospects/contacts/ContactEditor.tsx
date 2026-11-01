"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { ApiError } from "@/shared/portfolio/api/http";
import { contactInput, contactValues, type ProspectContact } from "./contracts";
import { useContactMutation, useLatestContact } from "./queries";
import { useContactCreate, type ContactCreation } from "./useContactCreate";
import styles from "./contacts.module.css";

type EditorProps = {
  prospectId: string;
  contact?: ProspectContact;
  available?: boolean;
  readOnly: boolean;
  onClose: () => void;
  returnFocus: () => void;
};

export function ContactEditor(props: EditorProps) {
  return props.contact ? (
    <ContactForm {...props} />
  ) : (
    <CreateContactEditor {...props} />
  );
}

function CreateContactEditor(props: EditorProps) {
  const creation = useContactCreate(props.prospectId);
  return <ContactForm {...props} creation={creation} />;
}

function ContactForm({
  prospectId,
  contact,
  available = true,
  readOnly,
  onClose,
  returnFocus,
  creation,
}: EditorProps & { creation?: ContactCreation }) {
  const [initial, setInitial] = useState(contact);
  const [draftValues, setValues] = useState(() => contactValues(contact));
  const retainedCreate =
    creation?.attempt && !creation.attempt.editable ? creation.attempt : null;
  const [loadedAttempt, setLoadedAttempt] = useState<string>();
  const attemptKey = creation?.attempt
    ? JSON.stringify(creation.attempt)
    : undefined;
  if (attemptKey && attemptKey !== loadedAttempt) {
    setLoadedAttempt(attemptKey);
    setValues(creation!.attempt!.values);
  }
  const values = retainedCreate?.values ?? draftValues;
  const [validation, setValidation] = useState("");
  const [invalidField, setInvalidField] = useState<string>();
  const validationId = useId();
  const [removing, setRemoving] = useState(false);
  const [latest, setLatest] = useState<ProspectContact>();
  const [requestId] = useState(() => crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);
  const review = useLatestContact(prospectId);
  const mutation = useContactMutation(prospectId, onClose);
  const conflict =
    mutation.error instanceof ApiError && mutation.error.status === 409;
  const pending =
    mutation.isPending || review.isPending || Boolean(creation?.pending);
  const blocked = Boolean(creation && !creation.ready);
  const availability = useRef(0);
  if ((!available || readOnly) && latest) setLatest(undefined);
  useLayoutEffect(() => {
    availability.current++;
  }, [available, readOnly]);
  useEffect(() => {
    // A read failure may conceal an already dispatched write. Keep its owner
    // and request identity until its outcome can be reviewed; discard only
    // an editor that has never submitted a mutation.
    if (!available && mutation.isIdle && !creation) onClose();
  }, [available, mutation.isIdle, onClose, creation]);
  if (!available)
    return creation || mutation.isPending || mutation.isError ? (
      <p role="status">
        Your contact change is retained. Restore current access to review its
        outcome before continuing.
      </p>
    ) : null;
  return (
    <Dialog
      open
      title={contact?.name ?? "Add prospect contact"}
      drawer
      className={styles.drawer}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        returnFocus();
      }}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <form
        ref={formRef}
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (
            !available ||
            (readOnly && !retainedCreate) ||
            pending ||
            blocked ||
            (conflict && initial)
          )
            return;
          if (retainedCreate) {
            void creation!
              .retry()
              .then(onClose)
              .catch(() => undefined);
            return;
          }
          const result = contactInput.safeParse(values);
          if (!result.success) {
            setValidation(
              result.error.issues[0]?.message ?? "Check the contact details.",
            );
            const field = String(result.error.issues[0]?.path[0] ?? "name");
            setInvalidField(field);
            formRef.current
              ?.querySelector<
                HTMLInputElement | HTMLTextAreaElement
              >(`[name="${field}"]`)
              ?.focus();
            return;
          }
          setValidation("");
          setInvalidField(undefined);
          if (creation) {
            void creation
              .save(result.data)
              .then(onClose)
              .catch(() => undefined);
            return;
          }
          mutation.mutate({
            kind: "save",
            values: result.data,
            requestId,
            contact: initial,
          });
        }}
      >
        <div className={styles.fields}>
          <label>
            Name *
            <input
              name="name"
              aria-invalid={invalidField === "name"}
              aria-describedby={
                invalidField === "name" ? validationId : undefined
              }
              value={values.name}
              required
              aria-required
              maxLength={300}
              disabled={readOnly || pending || Boolean(retainedCreate)}
              onChange={(event) =>
                setValues({ ...values, name: event.target.value })
              }
            />
          </label>
          <p className="muted">
            Saved titles may describe current or historical roles. Verify
            changes against a dated source; keep former roles and the source in
            Notes.
          </p>
          <label>
            Title
            <input
              name="title"
              aria-invalid={invalidField === "title"}
              aria-describedby={
                invalidField === "title" ? validationId : undefined
              }
              value={values.title}
              maxLength={300}
              disabled={readOnly || pending || Boolean(retainedCreate)}
              onChange={(event) =>
                setValues({ ...values, title: event.target.value })
              }
            />
          </label>
          <div className={styles.pair}>
            <label>
              Email
              <input
                name="email"
                aria-invalid={invalidField === "email"}
                aria-describedby={
                  invalidField === "email" ? validationId : undefined
                }
                type="email"
                value={values.email}
                maxLength={320}
                disabled={readOnly || pending || Boolean(retainedCreate)}
                onChange={(event) =>
                  setValues({ ...values, email: event.target.value })
                }
              />
            </label>
            <label>
              Phone
              <input
                name="phone"
                aria-invalid={invalidField === "phone"}
                aria-describedby={
                  invalidField === "phone" ? validationId : undefined
                }
                value={values.phone}
                maxLength={120}
                disabled={readOnly || pending || Boolean(retainedCreate)}
                onChange={(event) =>
                  setValues({ ...values, phone: event.target.value })
                }
              />
            </label>
          </div>
          <TextareaField
            name="notes"
            aria-invalid={invalidField === "notes"}
            aria-describedby={
              invalidField === "notes" ? validationId : undefined
            }
            label="Notes"
            value={values.notes}
            maxLength={4000}
            rows={5}
            disabled={readOnly || pending || Boolean(retainedCreate)}
            onChange={(event) =>
              setValues({ ...values, notes: event.target.value })
            }
          />
          {readOnly && (
            <p role="status">Contacts are read-only for this prospect.</p>
          )}
          {readOnly && creation?.ready && !retainedCreate && (
            <p role="status">No saved contact creation needs recovery.</p>
          )}
          {creation?.attempt?.editable && !readOnly && (
            <p role="status">
              The contact creation was refused. You can correct its details and
              save again.
            </p>
          )}
          {validation && (
            <p id={validationId} className="error" role="alert">
              {validation}
            </p>
          )}
          <QueryState error={creation?.error ?? mutation.error} />
          {creation && !creation.ready && (
            <p role="status">
              {creation.loading
                ? "Checking saved contact creation…"
                : "Saved contact recovery is unavailable."}
              {!creation.loading && (
                <button
                  type="button"
                  className="button"
                  onClick={creation.reload}
                >
                  Check recovery again
                </button>
              )}
            </p>
          )}
          {retainedCreate && (
            <p role="status">
              This creation may have completed. Its submitted details are locked
              and retained when this view closes. Retry original save uses the
              same request and may create the contact if the first attempt did
              not complete.
            </p>
          )}
          {conflict && initial && (
            <section className="status stack">
              <p>
                Your unsaved changes are preserved. Review the latest contact
                before saving again.
              </p>
              <button
                type="button"
                className="button"
                disabled={pending || readOnly}
                onClick={() => {
                  if (!available || readOnly || pending || !initial) return;
                  const generation = availability.current;
                  review.mutate(initial.id, {
                    onSuccess: (latest) => {
                      if (availability.current === generation)
                        setLatest(latest);
                    },
                  });
                }}
              >
                Review latest contact
              </button>
              <QueryState error={review.error} />
              {latest && (
                <>
                  <p>
                    Latest saved version {latest.version}: {latest.name} ·{" "}
                    {latest.title ?? "No title"}
                  </p>
                  <dl>
                    {(["email", "phone", "notes"] as const).map((key) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{latest[key] ?? "None"}</dd>
                      </div>
                    ))}
                  </dl>
                  <button
                    type="button"
                    className="button"
                    onClick={() => {
                      if (!available || readOnly || pending) return;
                      setInitial(latest);
                      setValues(contactValues(latest));
                      setLatest(undefined);
                      setRemoving(false);
                      mutation.reset();
                    }}
                  >
                    Replace my draft with latest values
                  </button>
                </>
              )}
            </section>
          )}
          {removing && (
            <section className="status stack" role="alert">
              <p>
                Remove {initial?.name} from this prospect? The contact record
                will be archived.
              </p>
              <div className="row">
                <button
                  type="button"
                  className="button"
                  disabled={pending}
                  onClick={() => setRemoving(false)}
                >
                  Keep contact
                </button>
                <button
                  type="button"
                  className="button primary"
                  disabled={pending || readOnly || conflict}
                  onClick={() => {
                    if (!available || readOnly || pending || conflict) return;
                    if (initial)
                      mutation.mutate({ kind: "remove", contact: initial });
                  }}
                >
                  Confirm removal
                </button>
              </div>
            </section>
          )}
        </div>
        <footer className={styles.footer}>
          {initial && !readOnly && (
            <button
              type="button"
              className="button ghost"
              disabled={pending}
              onClick={() => setRemoving(true)}
            >
              Remove
            </button>
          )}
          <span className={styles.spacer} />
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={onClose}
          >
            {readOnly ? "Close contact" : "Cancel"}
          </button>
          {(!readOnly || retainedCreate) && (
            <button
              className="button primary"
              disabled={pending || blocked || (conflict && Boolean(initial))}
            >
              {pending
                ? "Saving…"
                : retainedCreate
                  ? "Retry original save"
                  : "Save contact"}
            </button>
          )}
        </footer>
      </form>
    </Dialog>
  );
}
