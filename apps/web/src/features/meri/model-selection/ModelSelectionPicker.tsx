"use client";
import { useId, useMemo } from "react";
import {
  Cascader,
  CascaderTrigger,
  CascaderContent,
  CascaderPanel,
  CascaderNav,
  CascaderBack,
  CascaderBreadcrumb,
  CascaderInput,
  CascaderList,
  CascaderItems,
  CascaderEmpty,
} from "@capiro/ui/cascader";
import {
  DEFAULT_MODEL_VALUE,
  modelOptions,
  selectionKey,
  selectionLabel,
  selectionAvailable,
  type ModelCatalog,
  type ModelSelection,
} from "./model-selection";
import styles from "./model-selection.module.css";

/** One adopted picker for the saved default and the next conversation input. */
export function ModelSelectionPicker({
  catalog,
  value,
  onChange,
  disabled = false,
  compact = false,
  label,
  defaultLabel = "Use default",
  defaultDescription,
}: {
  catalog: ModelCatalog;
  value: ModelSelection | null;
  onChange: (value: ModelSelection | null) => void;
  disabled?: boolean;
  compact?: boolean;
  label: string;
  defaultLabel?: string;
  defaultDescription?: string;
}) {
  const id = useId();
  const items = useMemo(
    () => modelOptions(catalog, defaultLabel),
    [catalog, defaultLabel],
  );
  const selected = value ? selectionLabel(catalog, value) : defaultLabel;
  const available = selectionAvailable(catalog, value);
  return (
    <div className={compact ? styles.compact : styles.field}>
      {!compact && <label htmlFor={id}>{label}</label>}
      <Cascader
        items={items}
        value={value ? selectionKey(value) : DEFAULT_MODEL_VALUE}
        id={id}
        mode="drill"
        selectable="leaf"
        searchScope="global"
        disabled={disabled}
        invalid={!available}
        maxHeight={280}
        onValueChange={(_key, details) => {
          const choice = details.node?.data;
          if (
            !disabled &&
            choice !== undefined &&
            selectionAvailable(catalog, choice)
          )
            onChange(choice);
        }}
      >
        <CascaderTrigger
          className={styles.trigger}
          aria-label={`${label}: ${selected}`}
          aria-describedby={`${id}-help`}
          title={selected}
        >
          <span className={styles.value}>{selected}</span>
        </CascaderTrigger>
        <CascaderContent className={styles.popup}>
          <CascaderPanel>
            <CascaderNav>
              <CascaderBack />
              <CascaderBreadcrumb />
            </CascaderNav>
            <CascaderInput placeholder="Search provider, model or effort" />
            <CascaderList>
              <CascaderItems />
            </CascaderList>
            <CascaderEmpty>No matching models</CascaderEmpty>
          </CascaderPanel>
        </CascaderContent>
      </Cascader>
      <span
        id={`${id}-help`}
        className={compact && available ? "sr-only" : styles.help}
      >
        {!available
          ? "This selection is unavailable. Choose an available model or use the default."
          : value
            ? "Applies when you save or send."
            : defaultDescription}
      </span>
    </div>
  );
}
