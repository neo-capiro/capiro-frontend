"use client";
import { useId, useLayoutEffect, useMemo, useState } from "react";
import {
  parseWorkspaceThemeList,
  parseWorkspaceThemeDetail,
  parseWorkspaceThemeVersion,
  type BlueprintTheme,
} from "@capiro/shared/workspace-template-studio";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  SelectInput,
  StatusPanel,
} from "../../../../shared/module-ui";
import styles from "./studio-authoring.module.css";
import { createRequestLifetime } from "../../../../shared/session/request-lifetime";

export function BlueprintThemePicker({
  onChoose,
  onPendingChange,
}: {
  onChoose: (theme: BlueprintTheme) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const api = useCapiro();
  const pickerId = useId();
  const lifetime = useMemo(() => ({ api, ...createRequestLifetime() }), [api]);
  useLayoutEffect(() => lifetime.mount(), [lifetime]);
  const query = useCapiroQuery("workspace.themes.list", {});
  const list =
    query.data === undefined ? undefined : parseWorkspaceThemeList(query.data);
  const [themeId, setThemeId] = useState(""),
    [versionId, setVersionId] = useState("");
  const detail = useCapiroQuery(
    "workspace.themes.detail",
    { params: { themeId } },
    { enabled: Boolean(themeId) },
  );
  const parsed =
    detail.data === undefined
      ? undefined
      : parseWorkspaceThemeDetail(detail.data, { themeId });
  const theme = parsed?.ok ? parsed.value : undefined;
  const selected = theme?.versions.find(
    (row) => row.id === versionId && row.status === "published",
  );
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  return (
    <div className={styles.fields}>
      <h4>Copy a published theme’s settings</h4>
      <p>
        Copies the selected saved settings into this definition. Future theme
        versions will not update this copy.
      </p>
      <StatusPanel
        loading={query.loading}
        error={
          query.error || (list && !list.ok)
            ? "Could not load themes."
            : undefined
        }
        onRetry={query.reload}
      />
      {list?.ok && (
        <Field label="Theme to copy" htmlFor={`${pickerId}-theme`}>
          <SelectInput
            id={`${pickerId}-theme`}
            aria-label="Theme to copy"
            disabled={pending}
            value={themeId}
            placeholder="Choose a theme"
            options={list.value.map((row) => ({
              value: row.id,
              label: row.name,
            }))}
            onValueChange={(id) => {
              setThemeId(id);
              setVersionId("");
              setMessage("");
            }}
          />
        </Field>
      )}
      <StatusPanel
        loading={detail.loading}
        error={
          detail.error || (parsed && !parsed.ok)
            ? "Could not read this theme."
            : undefined
        }
        onRetry={detail.reload}
      />
      {theme && (
        <Field label="Published theme version" htmlFor={`${pickerId}-version`}>
          <SelectInput
            id={`${pickerId}-version`}
            aria-label="Published theme version"
            disabled={pending}
            value={selected?.id ?? ""}
            placeholder="Choose a published version"
            options={theme.versions
              .filter((row) => row.status === "published")
              .map((row) => ({ value: row.id, label: `v${row.version}` }))}
            onValueChange={setVersionId}
          />
        </Field>
      )}
      <ActionButton
        disabled={!selected || pending}
        onClick={async () => {
          if (!selected || !theme) return;
          setPending(true);
          onPendingChange(true);
          setMessage("");
          const signal = lifetime.signal();
          try {
            const params = { themeId: theme.id, versionId: selected.id };
            const current = parseWorkspaceThemeVersion(
              await api.request(
                "workspace.themes.version",
                { params },
                { signal },
              ),
              params,
            );
            if (
              !current.ok ||
              current.value.status !== "published" ||
              current.value.settingsHash !== selected.settingsHash
            )
              throw new Error("Theme version changed. Refresh before copying.");
            if (signal.aborted) return;
            onChoose({
              id: theme.id,
              name: theme.name,
              settings: current.value.settings,
            });
            setMessage(
              `Copied ${theme.name} v${selected.version} into this unsaved definition.`,
            );
          } catch (error) {
            if (signal.aborted) return;
            setMessage(
              error instanceof Error
                ? error.message
                : "Could not copy theme settings.",
            );
          } finally {
            if (!signal.aborted) {
              setPending(false);
              onPendingChange(false);
            }
          }
        }}
      >
        Copy selected theme settings
      </ActionButton>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
