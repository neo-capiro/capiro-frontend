"use client";
import { useState } from "react";
import {
  Cascader,
  CascaderTrigger,
  CascaderContent,
  CascaderPanel,
  CascaderNav,
  CascaderInput,
  CascaderBreadcrumb,
  CascaderEmpty,
  CascaderList,
  CascaderItems,
  CascaderStatus,
  CascaderValue,
  type CascaderNode,
} from "@capiro/ui/cascader";
import { mockCatalog, type ModelSelectionV1 } from "./mock-model-catalog";
import styles from "./model-picker.module.css";

const key = (provider: string, model: string, level: string) =>
  JSON.stringify([provider, model, level]);
const choices = new Map<string, ModelSelectionV1>();
const items: CascaderNode[] = mockCatalog.providers.map((provider) => ({
  value: provider.id,
  label: provider.label,
  disabled: provider.availability !== "available",
  description:
    "unavailableReason" in provider
      ? String(provider.unavailableReason)
      : undefined,
  children: provider.models.map((model) => ({
    value: `${provider.id}:${model.id}`,
    label: model.label,
    disabled: model.availability !== "available",
    description:
      "unavailableReason" in model
        ? String(model.unavailableReason)
        : undefined,
    children: model.reasoningLevels.map((level) => {
      const value = key(provider.id, model.id, level.id);
      choices.set(value, {
        version: "meri.model-selection.v1",
        provider: provider.id,
        modelId: model.id,
        reasoningLevelId: level.id,
        catalogRevision: mockCatalog.revision,
      });
      return {
        value,
        label: level.label,
        disabled: level.availability !== "available",
        description:
          "unavailableReason" in level ? level.unavailableReason : undefined,
      };
    }),
  })),
}));

/** Synthetic MP review interaction. State never leaves this component. */
export function MockModelPicker() {
  const [value, setValue] = useState("");
  const selection = choices.get(value);
  return (
    <details className={styles.preview}>
      <summary>Model &amp; reasoning · Mock preview</summary>
      <p>
        Example choices only. This selection is unsaved and does not change a
        conversation or account default.
      </p>
      <Cascader
        items={items}
        value={value}
        onValueChange={(next) => {
          if (choices.has(next)) setValue(next);
        }}
      >
        <CascaderTrigger
          className={styles.trigger}
          aria-label="Preview model and reasoning"
        >
          <CascaderValue placeholder="Choose an example model" />
        </CascaderTrigger>
        <CascaderContent className={styles.popup}>
          <CascaderPanel>
            <CascaderNav>
              <CascaderInput placeholder="Search examples" />
            </CascaderNav>
            <CascaderBreadcrumb />
            <CascaderEmpty />
            <CascaderList>
              <CascaderItems />
            </CascaderList>
            <CascaderStatus />
          </CascaderPanel>
        </CascaderContent>
      </Cascader>
      {selection && (
        <p role="status">
          Example selected locally. No model setting was saved.
        </p>
      )}
    </details>
  );
}
