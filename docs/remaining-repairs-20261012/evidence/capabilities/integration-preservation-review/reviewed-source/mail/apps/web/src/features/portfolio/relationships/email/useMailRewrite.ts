"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { requestMailRewrite, rewrittenMailText } from "./rewrite";
import { plainMailBody, type MailBody } from "./mail-body";

type RewriteStatus = {
  isPending: boolean;
  canUndo: boolean;
  error: Error | null;
  warning: string;
};
type RewriteAttempt = {
  controller: AbortController;
  assert: () => void;
};
const idle: RewriteStatus = {
  isPending: false,
  canUndo: false,
  error: null,
  warning: "",
};

export function useMailRewrite({
  sourceKey,
  initialBody,
  recipient,
  captureAuthority,
}: {
  /** Client, contact, thread and current draft recipients, without the body. */
  sourceKey: string;
  initialBody: string;
  recipient: { name: string; title: string | null };
  captureAuthority: () => () => void;
}) {
  const api = useApi();
  const cache = useQueryClient();
  const [body, setBody] = useState(() => plainMailBody(initialBody));
  const [state, setState] = useState({ ...idle, sourceKey });
  const revision = useRef(0);
  const lifetime = useRef({ active: false, sourceKey });
  const pending = useRef<RewriteAttempt | null>(null);
  const previous = useRef<{
    body: MailBody;
    sourceKey: string;
    assert: () => void;
  } | null>(null);
  // Forget the old status even if this composer later returns to that source.
  if (state.sourceKey !== sourceKey) setState({ ...idle, sourceKey });

  useLayoutEffect(() => {
    const scope = { active: true, sourceKey };
    lifetime.current = scope;
    const unsubscribe = cache.getQueryCache().subscribe((event) => {
      const attempt = pending.current;
      if (
        event.query.queryKey[0] !== "identity" ||
        (!attempt && !previous.current)
      )
        return;
      try {
        attempt?.assert();
        previous.current?.assert();
      } catch (error) {
        pending.current = null;
        previous.current = null;
        attempt?.controller.abort();
        setState({
          ...idle,
          sourceKey,
          error:
            error instanceof Error
              ? error
              : new Error("The rewrite could not be completed."),
        });
      }
    });
    return () => {
      scope.active = false;
      unsubscribe();
      pending.current?.controller.abort();
      pending.current = null;
      previous.current = null;
    };
  }, [cache, sourceKey]);

  function edit(value: MailBody) {
    revision.current++;
    const attempt = pending.current;
    pending.current = null;
    attempt?.controller.abort();
    previous.current = null;
    setBody(value);
    setState({ ...idle, sourceKey });
  }

  function undo() {
    const saved = previous.current;
    if (
      pending.current ||
      !saved ||
      saved.sourceKey !== sourceKey ||
      !lifetime.current.active
    )
      return;
    try {
      saved.assert();
      edit(saved.body);
    } catch (error) {
      previous.current = null;
      setState({
        ...idle,
        sourceKey,
        error:
          error instanceof Error
            ? error
            : new Error("This rewrite can no longer be undone."),
      });
    }
  }

  async function rewrite() {
    if (pending.current) return;
    const scope = lifetime.current;
    if (!scope.active || scope.sourceKey !== sourceKey) return;
    const draftRevision = revision.current;
    const controller = new AbortController();
    let attempt: RewriteAttempt | null = null;
    try {
      const assertAuthority = captureAuthority();
      attempt = {
        controller,
        assert: () => {
          controller.signal.throwIfAborted();
          if (
            !scope.active ||
            revision.current !== draftRevision ||
            pending.current !== attempt
          )
            throw new DOMException("This rewrite draft changed.", "AbortError");
          assertAuthority();
        },
      };
      pending.current = attempt;
      setState({
        ...idle,
        sourceKey,
        isPending: true,
        canUndo: Boolean(previous.current),
      });
      const result = await requestMailRewrite(
        api,
        {
          rawText: body.text,
          recipientName: recipient.name,
          ...(recipient.title ? { recipientTitle: recipient.title } : {}),
        },
        controller.signal,
        attempt.assert,
      );
      attempt.assert();
      if (result.verified) {
        const rewritten = rewrittenMailText(result.bodyHtml, body.text);
        if (rewritten !== body.text) {
          previous.current = { body, sourceKey, assert: assertAuthority };
          setBody(plainMailBody(rewritten));
        }
      }
      setState({
        ...idle,
        sourceKey,
        canUndo: Boolean(previous.current),
        warning: result.verified
          ? ""
          : "Meri could not verify the rewrite. Your original content was retained.",
      });
    } catch (error) {
      if (scope.active && pending.current === attempt)
        setState({
          ...idle,
          sourceKey,
          canUndo: Boolean(previous.current),
          error:
            error instanceof Error
              ? error
              : new Error("The rewrite could not be completed."),
        });
    } finally {
      if (pending.current === attempt) pending.current = null;
    }
  }

  return {
    ...(state.sourceKey === sourceKey ? state : idle),
    body,
    edit,
    rewrite,
    undo,
  };
}
