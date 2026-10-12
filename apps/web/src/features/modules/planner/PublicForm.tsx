"use client";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { createCapiroApi } from "../../../shared/capiro/http";
import {
  publicForm,
  publicFormToken,
  publicPlannerFormOperations,
} from "../../../shared/capiro/operations/planner-public-forms";
import { ActionButton, StatusPanel } from "../../../shared/module-ui";
import { FormAnswers } from "./FormAnswers";
import { visibleFormQuestions } from "./form-model";
import styles from "./public-form.module.css";
const api = createCapiroApi(publicPlannerFormOperations);

export function PublicForm({ token }: { token: string }) {
  const [revision, reload] = useState(0);
  return (
    <FormRequest
      key={`${token}:${revision}`}
      token={token}
      reload={() => reload((value) => value + 1)}
    />
  );
}
function FormRequest({ token, reload }: { token: string; reload: () => void }) {
  const [form, setForm] = useState<z.infer<typeof publicForm>>(),
    [error, setError] = useState<Error | undefined>(() =>
      publicFormToken.safeParse(token).success
        ? undefined
        : new Error("This form link is unavailable."),
    );
  useEffect(() => {
    const controller = new AbortController();
    if (!publicFormToken.safeParse(token).success) return;
    api
      .request(
        "public-form.read",
        { params: { token } },
        { signal: controller.signal },
      )
      .then(
        (value) => {
          if (!controller.signal.aborted) setForm(value);
        },
        (cause) => {
          if (!controller.signal.aborted)
            setError(
              cause instanceof Error
                ? cause
                : new Error("This form could not be loaded."),
            );
        },
      );
    return () => controller.abort();
  }, [token]);
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-label="Public request form">
        <p className={styles.eyebrow}>Capiro Planner</p>
        <StatusPanel loading={!form && !error} error={error} onRetry={reload}>
          {form && (
            <PublicFormQuestions key={token} token={token} form={form} />
          )}
        </StatusPanel>
      </section>
    </main>
  );
}
function PublicFormQuestions({
  token,
  form,
}: {
  token: string;
  form: z.infer<typeof publicForm>;
}) {
  const [answers, setAnswers] = useState<
      Record<string, string | number | string[]>
    >({}),
    [files, setFiles] = useState<Record<string, File[]>>({}),
    [busy, setBusy] = useState(false),
    [submitted, setSubmitted] = useState(false),
    [error, setError] = useState<string>();
  const inFlight = useRef(false),
    lifetime = useRef(new AbortController());
  useEffect(() => {
    if (lifetime.current.signal.aborted)
      lifetime.current = new AbortController();
    const scope = lifetime.current;
    return () => scope.abort();
  }, []);
  const fields = visibleFormQuestions(form.fields, answers);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(undefined);
    const signal = lifetime.current.signal,
      body = Object.fromEntries(
        fields
          .filter((field) => answers[field.id] !== undefined)
          .map((field) => [field.id, answers[field.id]!]),
      );
    const uploads = fields.flatMap((field) =>
      (files[field.id] ?? []).map((file) => ({ field: field.id, file })),
    );
    try {
      if (uploads.length)
        await api.upload(
          "public-form.upload",
          { params: { token }, body: { answers: body } },
          uploads,
          { signal },
        );
      else
        await api.request(
          "public-form.submit",
          { params: { token }, body },
          { signal },
        );
      if (!signal.aborted) setSubmitted(true);
    } catch (cause) {
      if (!signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "Your request could not be submitted.",
        );
    } finally {
      inFlight.current = false;
      if (!signal.aborted) setBusy(false);
    }
  };
  return (
    <>
      <h1 className={styles.title}>{form.name}</h1>
      {form.description && (
        <p className={styles.description}>{form.description}</p>
      )}
      {submitted ? (
        <div role="status">
          <h2>{form.confirmationMessage || "Your request was received."}</h2>
          {form.allowAnotherSubmission && (
            <ActionButton
              onClick={() => {
                setAnswers({});
                setFiles({});
                setSubmitted(false);
              }}
            >
              Submit another request
            </ActionButton>
          )}
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={busy} className={styles.questions}>
            <FormAnswers
              fields={fields}
              answers={answers}
              onAnswer={(id, value) =>
                setAnswers((current) => ({ ...current, [id]: value }))
              }
              onFiles={setFiles}
            />
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <div>
              <ActionButton primary type="submit">
                {busy ? "Submitting…" : "Submit request"}
              </ActionButton>
            </div>
          </fieldset>
        </form>
      )}
    </>
  );
}
