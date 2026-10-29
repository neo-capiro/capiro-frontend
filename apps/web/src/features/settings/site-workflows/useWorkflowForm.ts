"use client";
import { useState, type FormEvent } from "react";
import {
  parseSaveSiteWorkflow,
  type SiteWorkflowConfiguration,
} from "@capiro/shared/site-workflows";
import { useSettingsMutation } from "../useSettingsMutation";
import { newWorkflow } from "./form";
export function useWorkflowForm(
  initial: SiteWorkflowConfiguration | undefined,
  saved: (row: SiteWorkflowConfiguration) => void,
  readOnly: boolean,
) {
  const mutation = useSettingsMutation("site-workflows"),
    { action } = mutation;
  const locked = readOnly || mutation.locked;
  const [value, setValue] = useState(
    initial
      ? { ...initial.manifest, version: initial.manifest.version + 1 }
      : newWorkflow(),
  );
  const [enabled, setEnabled] = useState(initial?.enabled ?? false),
    [reviewed, setReviewed] = useState(false);
  const change = (next: typeof value) => {
    setValue(next);
    setReviewed(false);
  };
  const changeEnabled = (next: boolean) => {
    setEnabled(next);
    setReviewed(false);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!reviewed || locked) return;
    void action.run(
      (signal) => {
        const body = parseSaveSiteWorkflow({
          requestId: crypto.randomUUID(),
          expectedVersion: initial?.manifest.version ?? 0,
          enabled,
          manifest: {
            ...value,
            origins: value.origins.map((s) => s.trim()).filter(Boolean),
            idpOrigins: value.idpOrigins.map((s) => s.trim()).filter(Boolean),
            sensitiveSelectors: value.sensitiveSelectors
              .map((s) => s.trim())
              .filter(Boolean),
          },
        });
        return mutation.api.request(
          "settings.siteWorkflows.save",
          { body },
          { signal },
        );
      },
      "Workflow version saved.",
      (result) => saved(result.configuration),
    );
  };
  return {
    mutation,
    action,
    locked,
    value,
    change,
    enabled,
    changeEnabled,
    reviewed,
    setReviewed,
    submit,
  };
}
