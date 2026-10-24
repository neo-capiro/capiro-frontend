"use client";
import { useLayoutEffect, useRef } from "react";
import type { ContactCreation } from "./contact-create-attempt";

export function ContactCreateRecovery({
  creation,
  onSaved,
}: {
  creation: ContactCreation;
  onSaved?: () => void;
}) {
  const lifetime = useRef({ active: false });
  useLayoutEffect(() => {
    const current = { active: true };
    lifetime.current = current;
    return () => {
      current.active = false;
    };
  }, []);
  const recover = (kind: "check" | "retry") => {
    const current = lifetime.current;
    void creation
      .recover(kind)
      .then(() => {
        if (current.active) onSaved?.();
      })
      .catch(() => {});
  };
  return (
    <div className="stack">
      {creation.error && <p role="alert">{creation.error}</p>}
      {!creation.ready && (
        <button className="button" onClick={creation.reload}>
          Reload saved contact attempt
        </button>
      )}
      {creation.attempt && (
        <>
          <p role="status">
            The save for {creation.attempt.input.name} needs confirmation. Check
            its result or retry the same save. A roster match does not confirm
            it.
          </p>
          <div className="row">
            <button
              className="button"
              disabled={creation.busy || !creation.ready}
              onClick={() => recover("check")}
            >
              Check save
            </button>
            <button
              className="button"
              disabled={creation.busy || !creation.ready}
              onClick={() => recover("retry")}
            >
              Retry save
            </button>
          </div>
        </>
      )}
      {creation.receipt && !creation.attempt && (
        <p role="status">
          {creation.receipt.available
            ? "Contact creation confirmed. The roster shows its current details."
            : "Contact creation confirmed. The contact was subsequently removed; it was not created again."}
        </p>
      )}
    </div>
  );
}
