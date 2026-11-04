"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { safeWebsite } from "@/features/portfolio/index/public";
import { refreshAppliedSurfaces } from "./review-effects";
import { type ProfileSubject } from "./subject";
import { useProfileSnapshot } from "./profile-queries";
import {
  useProfileBuildAccess,
  isProfileAccessDenied,
  resetDeniedProfileReads,
} from "./queries";
import { assertReviewAccess } from "./actions";
import { resolveFactConflict } from "./profile-api";
import { isAutomaticFact } from "./automatic-acceptance";
import { AutomaticFactReview } from "./AutomaticFactReview";
import type { ProfileFact } from "./fact-contracts";
import styles from "./profile-build.module.css";

export function FactSource({ fact }: { fact: ProfileFact }) {
  return (
    <div className={styles.evidence}>
      <small>
        {fact.origin === "person"
          ? "Added by a person"
          : fact.origin === "official"
            ? "Official record"
            : fact.origin === "legacy"
              ? "Imported profile value"
              : "Researched"}{" "}
        ·{" "}
        {isAutomaticFact(fact)
          ? "Automatically accepted · exact identifier"
          : fact.status}
        {fact.observedAt
          ? ` · Observed ${new Date(fact.observedAt).toLocaleDateString()}`
          : ""}
        {fact.confidence !== null
          ? ` · ${Math.round(fact.confidence * 100)}% confidence`
          : ""}
      </small>
      {fact.sourceUnavailable && (
        <small>Original source is no longer shared</small>
      )}
      {!fact.sourceUnavailable &&
        fact.evidence.map((item, index) => (
          <div key={index}>
            {safeWebsite(item.url) ? (
              <a href={safeWebsite(item.url)} target="_blank" rel="noreferrer">
                {item.label} ↗
              </a>
            ) : (
              <span>{item.label}</span>
            )}
            {item.excerpt && <blockquote>{item.excerpt}</blockquote>}
          </div>
        ))}
      {!fact.sourceUnavailable &&
        fact.sourceUrl &&
        safeWebsite(fact.sourceUrl) && (
          <a
            href={safeWebsite(fact.sourceUrl)}
            target="_blank"
            rel="noreferrer"
          >
            View source ↗
          </a>
        )}
      {fact.approvedAt && (
        <small>Approved {new Date(fact.approvedAt).toLocaleDateString()}</small>
      )}
    </div>
  );
}
function displayValue(value: unknown): string {
  if (value == null) return "Not provided";
  if (Array.isArray(value)) return value.map(displayValue).join(", ");
  if (typeof value === "object")
    return Object.entries(value)
      .map(([key, item]) => `${fieldLabel(key)}: ${displayValue(item)}`)
      .join(" · ");
  return String(value);
}
function fieldLabel(key: string) {
  return key.replaceAll(".", " · ").replace(/([a-z])([A-Z])/g, "$1 $2");
}
export function ProfileFacts({ subject }: { subject: ProfileSubject }) {
  const query = useProfileSnapshot(subject);
  const { canEdit, identity } = useProfileBuildAccess();
  const writableSnapshot =
    canEdit &&
    query.isSuccess &&
    !query.error &&
    Boolean(query.data) &&
    !query.isFetching;
  const actor = `${identity.data?.tenant?.id}:${identity.data?.user.id}:${subject.kind}:${subject.id}`;
  const current = useRef(actor);
  useLayoutEffect(() => {
    current.current = actor;
    return () => {
      current.current = "";
    };
  }, [actor]);
  const api = useApi();
  const cache = useQueryClient();
  const [automaticFact, setAutomaticFact] = useState<ProfileFact>();
  const [attempt, setAttempt] = useState<{
    factId: string;
    requestId: string;
    expectedVersion: number;
    resolution: "keep_current" | "accept_proposed";
    actor: string;
  }>();
  const resolve = useMutation({
    retry: false,
    onError: (error) => resetDeniedProfileReads(cache, subject, error),
    mutationFn: async (input: NonNullable<typeof attempt>) => {
      if (!writableSnapshot || current.current !== input.actor)
        throw new Error(
          "Your profile session changed. Reload before reviewing.",
        );
      assertReviewAccess(
        cache,
        {
          userId: identity.data?.user.id ?? "",
          tenantId: identity.data?.tenant?.id ?? "",
        },
        true,
      );
      const saved = await resolveFactConflict(api, subject, input.factId, {
        requestId: input.requestId,
        expectedVersion: input.expectedVersion,
        resolution: input.resolution,
      });
      if (current.current !== input.actor)
        throw new Error(
          "Your profile session changed after review. Reload this profile.",
        );
      return saved;
    },
    onSuccess: async () => {
      setAttempt(undefined);
      await refreshAppliedSurfaces(cache, subject);
    },
  });
  const denied = isProfileAccessDenied(resolve.error);
  const profile = denied ? undefined : query.data;
  const canResolve = writableSnapshot && !denied;
  const refreshSnapshot = async () => {
    const current = await query.refetch();
    if (current.isSuccess) resolve.reset();
  };
  const decide = (
    fact: ProfileFact,
    version: number,
    resolution: "keep_current" | "accept_proposed",
  ) => {
    const input = {
      factId: fact.id,
      requestId: crypto.randomUUID(),
      expectedVersion: version,
      resolution,
      actor,
    };
    setAttempt(input);
    resolve.mutate(input);
  };
  return (
    <section
      className={`card stack ${styles.panel}`}
      aria-label="Sources and review"
    >
      <h2>Sources and review</h2>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void refreshSnapshot()}
      />
      <QueryState
        error={resolve.error}
        retry={denied ? () => void refreshSnapshot() : undefined}
      />
      {attempt && resolve.isError && (
        <button
          className="button"
          disabled={!canResolve || attempt.actor !== actor}
          onClick={() => resolve.mutate(attempt)}
        >
          Check or retry this decision
        </button>
      )}
      {profile?.conflicts
        .filter((c) => c.status === "pending")
        .map((conflict) => {
          const proposed = profile?.facts.find(
            (f) => f.id === conflict.proposedFactId,
          );
          const existing = profile?.facts.find(
            (f) => f.id === conflict.currentFactId,
          );
          if (!proposed) return null;
          return (
            <article className={styles.finding} key={conflict.id}>
              <h3>
                {fieldLabel(conflict.fieldKey)}{" "}
                <span className="chip">Needs review</span>
              </h3>
              <div className={styles.comparison}>
                <div>
                  <small>Current value</small>
                  <p>{displayValue(existing?.value)}</p>
                  {existing && <FactSource fact={existing} />}
                </div>
                <div>
                  <small>Proposed value</small>
                  <p>{displayValue(proposed.value)}</p>
                  <FactSource fact={proposed} />
                </div>
              </div>
              <div className="row">
                <button
                  className="button"
                  disabled={
                    !canResolve || resolve.isPending || Boolean(attempt)
                  }
                  onClick={() =>
                    decide(proposed, conflict.version, "keep_current")
                  }
                >
                  Keep current
                </button>
                <button
                  className="button primary"
                  disabled={
                    !canResolve || resolve.isPending || Boolean(attempt)
                  }
                  onClick={() =>
                    decide(proposed, conflict.version, "accept_proposed")
                  }
                >
                  Accept proposed
                </button>
              </div>
            </article>
          );
        })}
      {profile && (
        <details>
          <summary>
            Saved facts · {profile.facts.filter((f) => f.isCurrent).length}
          </summary>
          {profile.facts
            .filter((f) => f.isCurrent)
            .map((fact) => (
              <article className={styles.finding} key={fact.id}>
                <strong>{fieldLabel(fact.fieldKey)}</strong>
                <p>{displayValue(fact.value)}</p>
                <FactSource fact={fact} />
                {isAutomaticFact(fact) && fact.runId && fact.findingId && (
                  <button
                    type="button"
                    className="button ghost"
                    disabled={!canResolve}
                    onClick={() => setAutomaticFact(fact)}
                  >
                    Not right
                  </button>
                )}
              </article>
            ))}
        </details>
      )}
      {profile && automaticFact && (
        <AutomaticFactReview
          key={`${actor}:${automaticFact.id}`}
          subject={subject}
          fact={automaticFact}
          onClose={() => setAutomaticFact(undefined)}
        />
      )}
      {profile && !profile.facts.length && (
        <p className="muted">
          No sourced facts yet. Add details or research this profile.
        </p>
      )}
    </section>
  );
}
