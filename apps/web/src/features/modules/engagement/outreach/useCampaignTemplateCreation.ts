"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { useIdentity } from "../../../../shared/portfolio/auth/identity";
import type { ClassicOutreachTemplate } from "../../../../shared/capiro/operations/outreach-template-catalog";
import {
  createTemplateCreationOwner,
  templateCreationKey,
  type TemplateCreationState,
} from "./template-creation";

export function useCampaignTemplateCreation(
  onConfirmed: (template: ClassicOutreachTemplate) => void,
) {
  const api = useCapiro();
  const identity = useIdentity();
  const user = identity.data?.user.id,
    tenant = identity.data?.tenant?.id;
  const key =
    !identity.isError && user?.trim() && tenant?.trim()
      ? templateCreationKey(tenant, user)
      : null;
  const callback = useRef(onConfirmed);
  useLayoutEffect(() => {
    callback.current = onConfirmed;
  }, [onConfirmed]);
  const [current, setCurrent] = useState<{
    api: typeof api;
    key: string;
    owner?: ReturnType<typeof createTemplateCreationOwner>;
    state: TemplateCreationState;
  }>();
  useLayoutEffect(() => {
    if (!key) return;
    let owner: ReturnType<typeof createTemplateCreationOwner> | undefined;
    try {
      owner = createTemplateCreationOwner(
        api,
        window.sessionStorage,
        key,
        (state) => setCurrent({ api, key, owner, state }),
        (template) => callback.current(template),
      );
      setCurrent((value) =>
        value?.api === api && value.key === key ? { ...value, owner } : value,
      );
    } catch {
      setCurrent({
        api,
        key,
        state: {
          status: "blocked",
          error: "Creation status is unavailable. No template was submitted.",
        },
      });
    }
    return () => owner?.dispose();
  }, [api, key]);
  if (!key || current?.api !== api || current.key !== key)
    return {
      state: {
        status: "blocked",
        error: identity.isError
          ? "Could not verify your current account."
          : "Checking your account and creation status…",
      } as TemplateCreationState,
    };
  return { state: current.state, owner: current.owner };
}
