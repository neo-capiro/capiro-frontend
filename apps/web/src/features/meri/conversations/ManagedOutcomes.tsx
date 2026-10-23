"use client";
import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Toaster, toast } from "@capiro/ui/sonner";
import { Button } from "@capiro/ui/button";
import { requireManagementReceipt } from "../../../shared/capiro/operations/meri-conversation-management";
import type { PendingManagement } from "../../../shared/meri-conversations/management-journal";
import styles from "./managed-outcomes.module.css";

type Confirmed = (pending: PendingManagement, receipt: unknown) => void;
const ConfirmedContext = createContext<Confirmed>(() => {});
const messages = {
  rename: ["Conversation renamed", "The confirmed title is saved."],
  archive: [
    "Conversation archived",
    "History is retained. The chat is removed from recents.",
  ],
  trash: [
    "Conversation moved to Trash",
    "Restore within 30 days. Permanent deletion follows retention rules.",
  ],
  restore: [
    "Conversation restored",
    "The confirmed chat is available in recents.",
  ],
} as const;

function outcomeLifetime(scopeKey: string) {
  let active = false;
  const ids = new Set<string | number>();
  return {
    scopeKey,
    current: () => active,
    add: (id: string | number) => ids.add(id),
    remove: (id: string | number) => ids.delete(id),
    mount() {
      active = true;
      return () => {
        active = false;
        for (const id of ids) toast.dismiss(id);
        ids.clear();
      };
    },
  };
}

/** A mounted account/filter scope owns its notifications. No cross-tab message
 * or refreshed title can create a success notification. */
export function ManagedOutcomes({
  children,
  scopeKey,
}: {
  children: ReactNode;
  scopeKey: string;
}) {
  const toasterId = `${useId()}:${scopeKey}`;
  const owner = useMemo(() => outcomeLifetime(scopeKey), [scopeKey]);
  useLayoutEffect(() => owner.mount(), [owner]);
  const confirmed: Confirmed = (pending, receipt) => {
    if (!owner.current()) return;
    try {
      requireManagementReceipt(receipt, pending.request, pending.previous);
      const [title, detail] = messages[pending.request.operation];
      const id = `${toasterId}:${pending.request.requestId}`;
      owner.add(id);
      toast.custom(
        () => (
          <ManagedOutcomeCard
            title={title}
            detail={detail}
            dismiss={() => toast.dismiss(id)}
          />
        ),
        {
          id,
          toasterId,
          duration: 10_000,
          onDismiss: () => owner.remove(id),
          onAutoClose: () => owner.remove(id),
        },
      );
    } catch {
      // Optional presentation cannot turn an exact saved receipt into an unknown command.
    }
  };
  return (
    <ConfirmedContext.Provider value={confirmed}>
      {children}
      <Toaster
        key={scopeKey}
        id={toasterId}
        position="bottom-right"
        offset={24}
        mobileOffset={16}
        style={{ "--width": "min(400px, calc(100vw - 32px))" } as CSSProperties}
        customAriaLabel="Confirmed chat changes"
        hotkey={["altKey", "KeyT"]}
      />
    </ConfirmedContext.Provider>
  );
}

export const useManagedOutcome = () => useContext(ConfirmedContext);

function ManagedOutcomeCard({
  title,
  detail,
  dismiss,
}: {
  title: string;
  detail: string;
  dismiss(): void;
}) {
  return (
    <section className={styles.toast} aria-label={title}>
      <span className={styles.icon} aria-hidden="true">
        {/* Exact Figma Sonner check asset, intrinsic 14 × 14 geometry. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/figma/meri/m2/sonner-check.svg"
          alt=""
          width={14}
          height={14}
        />
      </span>
      <div className={styles.content}>
        <h2>{title}</h2>
        <p>{detail}</p>
        <Button
          type="button"
          variant="outline"
          className={styles.dismiss}
          onClick={dismiss}
        >
          Dismiss
        </Button>
      </div>
    </section>
  );
}
