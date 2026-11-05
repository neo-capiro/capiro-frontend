"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { assertReviewAccess } from "./actions";
import { safeEvidenceUrl } from "./contracts";
import { useProfileBuildAccess, resetDeniedProfileReads } from "./queries";
import {
  requestRegistrationSuggestions,
  type CodeSuggestion,
  type RegistrationCodeField,
  type RegistrationSuggestionContext,
  type RegistrationSuggestionCommand,
} from "./registration-suggestions";
import styles from "./profile-build.module.css";
type Props = {
  field: RegistrationCodeField;
  label: string;
  context: RegistrationSuggestionContext;
  value: string | string[];
  onAccept: (suggestion: CodeSuggestion) => void;
};
export function CodeSuggestions(props: Props) {
  const access = useProfileBuildAccess();
  const actor = {
    tenantId: access.identity.data?.tenant?.id ?? "",
    userId: access.identity.data?.user.id ?? "",
  };
  return (
    <SuggestionSession
      key={JSON.stringify([actor, props.field, props.context])}
      {...props}
      actor={actor}
      active={access.canRead}
    />
  );
}
function SuggestionSession({
  field,
  label,
  context,
  value,
  onAccept,
  actor,
  active,
}: Props & { actor: { tenantId: string; userId: string }; active: boolean }) {
  const api = useApi();
  const [acceptError, setAcceptError] = useState<Error>();
  const cache = useQueryClient();
  const lifetime = useRef<AbortController | null>(null);
  const command = useRef<RegistrationSuggestionCommand | undefined>(undefined);
  useLayoutEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);
  const mutation = useMutation({
    retry: false,
    onError: (error) =>
      context.subject
        ? resetDeniedProfileReads(cache, context.subject, error)
        : undefined,
    mutationFn: async () => {
      const controller = lifetime.current;
      if (!active || !controller)
        throw new Error(
          "Open a current profile session before requesting suggestions.",
        );
      controller.signal.throwIfAborted();
      assertReviewAccess(cache, actor, false);
      command.current ??= {
        ...context,
        field,
        currentValue: value,
        requestId: crypto.randomUUID(),
      };
      const result = await requestRegistrationSuggestions(
        api,
        command.current,
        controller.signal,
      );
      controller.signal.throwIfAborted();
      assertReviewAccess(cache, actor, false);
      command.current = undefined;
      return result;
    },
  });
  const result =
    active && mutation.isSuccess && !mutation.error && !acceptError
      ? mutation.data
      : undefined;
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <div className="stack" role="group" aria-label={`${label} suggestions`}>
      <button
        type="button"
        className="button ghost"
        disabled={
          !active ||
          mutation.isPending ||
          context.identity.name.trim().length < 2
        }
        onClick={() => {
          setAcceptError(undefined);
          mutation.mutate();
        }}
      >
        {mutation.isPending
          ? "Meri is checking sources…"
          : "Ask Meri to suggest"}
      </button>
      {context.identity.name.trim().length < 2 && (
        <small className="muted">
          Enter at least two characters in the company name first.
        </small>
      )}
      <QueryState
        pending={mutation.isPending}
        error={mutation.error ?? acceptError}
      />
      {result && (
        <>
          <p role="status" className="muted">
            {result.message}
          </p>
          {result.suggestions.map((suggestion) => (
            <article className={styles.finding} key={suggestion.code}>
              <strong>
                {suggestion.code} · {suggestion.label}
              </strong>
              <p>{suggestion.reason}</p>
              <small className="muted">
                Source confidence: {Math.round(suggestion.confidence * 100)}%
              </small>
              <details className={styles.evidence}>
                <summary>Sources · {suggestion.evidence.length}</summary>
                {suggestion.evidence.map((evidence, index) => {
                  const url = safeEvidenceUrl(evidence.url);
                  return (
                    <div key={index}>
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer">
                          {evidence.label} ↗
                        </a>
                      ) : (
                        <span>{evidence.label}</span>
                      )}
                      <blockquote>{evidence.excerpt}</blockquote>
                      {evidence.source && <small>{evidence.source}</small>}
                      {evidence.observedAt && (
                        <small>
                          Observed{" "}
                          {new Date(evidence.observedAt).toLocaleDateString()}
                        </small>
                      )}
                    </div>
                  );
                })}
              </details>
              <button
                type="button"
                className="button"
                disabled={!active || selected.includes(suggestion.code)}
                onClick={() => {
                  try {
                    lifetime.current?.signal.throwIfAborted();
                    assertReviewAccess(cache, actor, false);
                    onAccept(suggestion);
                  } catch (error) {
                    setAcceptError(
                      error instanceof Error
                        ? error
                        : new Error(
                            "Refresh this profile session before accepting a suggestion.",
                          ),
                    );
                  }
                }}
              >
                {selected.includes(suggestion.code)
                  ? "Selected"
                  : !Array.isArray(value) && value
                    ? `Replace current value with ${suggestion.code}`
                    : `Accept ${suggestion.code}`}
              </button>
            </article>
          ))}
          {result.sourceGaps.map((gap, index) => (
            <small className="muted" key={index}>
              {gap}
            </small>
          ))}
        </>
      )}
    </div>
  );
}
