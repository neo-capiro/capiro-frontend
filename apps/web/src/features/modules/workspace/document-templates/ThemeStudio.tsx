"use client";
import { useState } from "react";
import {
  parseWorkspaceThemeList,
  parseWorkspaceThemeDetail,
  parseWorkspaceThemeVersion,
  type WorkspaceTheme,
  type WorkspaceThemeVersion,
} from "@capiro/shared/workspace-template-studio";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
  StatusPanel,
} from "../../../../shared/module-ui";
import { StudioJson } from "./BlueprintDefinitionFields";
import { StudioText } from "./BlueprintSectionFields";
import { BlueprintStatus, blueprintDate } from "./BlueprintVersions";
import { sameStudioValue, type StudioWrite } from "./studio-write";
import styles from "./studio-authoring.module.css";
import catalogStyles from "./document-templates.module.css";

async function readThemeVersion(
  writer: StudioWrite,
  params: { themeId: string; versionId: string },
  signal: AbortSignal,
) {
  const parsed = parseWorkspaceThemeVersion(
    await writer.api.request(
      "workspace.themes.version",
      { params },
      { signal },
    ),
    params,
  );
  if (!parsed.ok) throw new Error("Could not verify the saved theme version.");
  return parsed.value;
}
function unchanged(
  expected: WorkspaceThemeVersion,
  actual: WorkspaceThemeVersion,
) {
  if (
    expected.status !== actual.status ||
    expected.settingsHash !== actual.settingsHash ||
    expected.version !== actual.version
  )
    throw new Error(
      "This theme version changed. Refresh it before continuing.",
    );
}

function ThemeCreate({
  writer,
  onClose,
  onCreated,
}: {
  writer: StudioWrite;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState(""),
    [slug, setSlug] = useState(""),
    [description, setDescription] = useState("");
  return (
    <Modal
      open
      title="New document theme"
      onOpenChange={(open) => {
        if (!open && writer.phase !== "pending") onClose();
      }}
      closeDisabled={writer.phase === "pending"}
    >
      <form
        className={styles.fields}
        onSubmit={(event) => {
          event.preventDefault();
          const body = { name: name.trim(), slug: slug.trim(), description };
          void writer.run("Create theme", async (send, signal) => {
            const parsed = parseWorkspaceThemeDetail(
              await send(() =>
                writer.api.request(
                  "workspace.themes.create",
                  { body },
                  { signal },
                ),
              ),
              { slug: body.slug },
            );
            if (
              !parsed.ok ||
              parsed.value.name !== body.name ||
              parsed.value.versions.length !== 1 ||
              parsed.value.versions[0]?.status !== "draft"
            )
              throw new Error("New theme was not confirmed.");
            const current = parseWorkspaceThemeDetail(
              await writer.api.request(
                "workspace.themes.detail",
                { params: { themeId: parsed.value.id } },
                { signal },
              ),
              { themeId: parsed.value.id },
            );
            if (
              !current.ok ||
              current.value.slug !== body.slug ||
              current.value.name !== body.name ||
              current.value.versions[0]?.id !== parsed.value.versions[0].id
            )
              throw new Error("Saved theme was not confirmed.");
            if (!signal.aborted) {
              onCreated(current.value.id);
              onClose();
            }
          });
        }}
      >
        <fieldset
          disabled={writer.locked}
          className={`${styles.fields} ${styles.unframed}`}
        >
          <StudioText
            label="Theme name"
            value={name}
            onChange={setName}
            maxLength={200}
          />
          <StudioText
            label="Theme slug"
            value={slug}
            onChange={setSlug}
            maxLength={120}
          />
          <StudioText
            label="Theme description"
            value={description}
            onChange={setDescription}
            maxLength={500}
            multiline
          />
          <ActionButton
            primary
            type="submit"
            disabled={writer.locked || !name.trim() || !slug.trim()}
          >
            Create theme
          </ActionButton>
        </fieldset>
        {writer.message && <p role="status">{writer.message}</p>}
      </form>
    </Modal>
  );
}

function ThemeVersionEditor({
  version,
  writer,
  onClose,
  onChanged,
}: {
  version: WorkspaceThemeVersion;
  writer: StudioWrite;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [settings, setSettings] = useState(version.settings);
  return (
    <Modal
      open
      title={`Edit theme v${version.version}`}
      className={styles.dialog}
      onOpenChange={(open) => {
        if (!open && writer.phase !== "pending") onClose();
      }}
      closeDisabled={writer.phase === "pending"}
    >
      <form
        className={styles.fields}
        onSubmit={(event) => {
          event.preventDefault();
          void writer.run("Save theme", async (send, signal) => {
            const params = { themeId: version.themeId, versionId: version.id };
            unchanged(version, await readThemeVersion(writer, params, signal));
            const parsed = parseWorkspaceThemeVersion(
              await send(() =>
                writer.api.request(
                  "workspace.themes.save",
                  {
                    params,
                    body: {
                      settings,
                      expectedSettingsHash: version.settingsHash,
                    },
                  },
                  { signal },
                ),
              ),
              params,
            );
            if (
              !parsed.ok ||
              parsed.value.status !== "draft" ||
              !sameStudioValue(parsed.value.settings, settings)
            )
              throw new Error("Theme save receipt did not match.");
            const current = await readThemeVersion(writer, params, signal);
            unchanged(parsed.value, current);
            if (!sameStudioValue(current.settings, settings))
              throw new Error("Saved theme settings did not match.");
            if (!signal.aborted) {
              onChanged();
              onClose();
            }
          });
        }}
      >
        <p>
          Settings are stored as a complete JSON object. Existing keys remain
          unchanged unless you edit them.
        </p>
        <fieldset
          disabled={writer.locked}
          className={`${styles.fields} ${styles.unframed}`}
        >
          <StudioJson
            label="Theme settings (JSON)"
            value={settings}
            objectOnly
            onChange={(value) => setSettings(value as Record<string, unknown>)}
          />
          <ActionButton primary type="submit" disabled={writer.locked}>
            Save theme settings
          </ActionButton>
        </fieldset>
        {writer.message && <p role="status">{writer.message}</p>}
      </form>
    </Modal>
  );
}

function ThemeVersionView({
  version,
  writer,
  onChanged,
}: {
  version: WorkspaceThemeVersion;
  writer: StudioWrite;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false),
    [confirm, setConfirm] = useState<"publish" | "retire">();
  return (
    <div className={styles.read}>
      <div className={styles.actions}>
        <h3>Version {version.version}</h3>
        <BlueprintStatus status={version.status} />
      </div>
      <p>Created {blueprintDate(version.createdAt)}</p>
      <pre aria-label="Saved theme settings">
        {JSON.stringify(version.settings, null, 2)}
      </pre>
      <div className={styles.actions}>
        {version.status === "draft" && (
          <>
            <ActionButton
              disabled={writer.locked}
              onClick={() => setEditing(true)}
            >
              Edit theme settings
            </ActionButton>
            <ActionButton
              disabled={writer.locked}
              onClick={() => setConfirm("publish")}
            >
              Publish theme version
            </ActionButton>
          </>
        )}
        {version.status === "published" && (
          <ActionButton
            disabled={writer.locked}
            onClick={() => setConfirm("retire")}
          >
            Retire theme version
          </ActionButton>
        )}
      </div>
      {editing && (
        <ThemeVersionEditor
          version={version}
          writer={writer}
          onClose={() => setEditing(false)}
          onChanged={onChanged}
        />
      )}
      {confirm && (
        <Modal
          open
          title={`${confirm === "publish" ? "Publish" : "Retire"} theme v${version.version}`}
          onOpenChange={(open) => {
            if (!open && writer.phase !== "pending") setConfirm(undefined);
          }}
          closeDisabled={writer.phase === "pending"}
        >
          <div className={styles.fields}>
            <p>
              {confirm === "publish"
                ? "Publish these saved settings. Published theme versions cannot be edited."
                : "Retire this version. Existing copied settings remain unchanged."}
            </p>
            <ActionButton
              primary
              disabled={writer.locked}
              onClick={() =>
                void writer.run(
                  confirm === "publish" ? "Publish theme" : "Retire theme",
                  async (send, signal) => {
                    const params = {
                      themeId: version.themeId,
                      versionId: version.id,
                    };
                    unchanged(
                      version,
                      await readThemeVersion(writer, params, signal),
                    );
                    const parsed = parseWorkspaceThemeVersion(
                      await send(() =>
                        writer.api.request(
                          confirm === "publish"
                            ? "workspace.themes.publish"
                            : "workspace.themes.retire",
                          {
                            params,
                            body: {
                              expectedSettingsHash: version.settingsHash,
                            },
                          },
                          { signal },
                        ),
                      ),
                      params,
                    );
                    if (
                      !parsed.ok ||
                      parsed.value.status !==
                        (confirm === "publish" ? "published" : "retired") ||
                      parsed.value.settingsHash !== version.settingsHash ||
                      !sameStudioValue(parsed.value.settings, version.settings)
                    )
                      throw new Error("Theme status was not confirmed.");
                    unchanged(
                      parsed.value,
                      await readThemeVersion(writer, params, signal),
                    );
                    if (!signal.aborted) {
                      setConfirm(undefined);
                      onChanged();
                    }
                  },
                )
              }
            >
              Confirm {confirm}
            </ActionButton>
            {writer.message && <p role="status">{writer.message}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

function ThemeDetail({
  id,
  writer,
  onCatalogChanged,
}: {
  id: string;
  writer: StudioWrite;
  onCatalogChanged: () => void;
}) {
  const query = useCapiroQuery("workspace.themes.detail", {
    params: { themeId: id },
  });
  const parsed =
    query.data === undefined
      ? undefined
      : parseWorkspaceThemeDetail(query.data, { themeId: id });
  const theme = parsed?.ok ? parsed.value : undefined;
  const [versionId, setVersionId] = useState("");
  const version = theme?.versions.find((row) => row.id === versionId);
  return (
    <section className={catalogStyles.detail}>
      <header className={catalogStyles.detailHeader}>
        <h2>{theme?.name ?? "Document theme"}</h2>
        <ActionButton onClick={query.reload}>Refresh theme</ActionButton>
      </header>
      <div className={styles.empty}>
        <StatusPanel
          loading={query.loading}
          error={
            query.error || (parsed && !parsed.ok)
              ? "Could not load this theme."
              : undefined
          }
          onRetry={query.reload}
        />
        {theme && (
          <div className={styles.fields}>
            <p>{theme.description}</p>
            <p>
              Firm members can manage this theme’s draft and published versions.
            </p>
            <ActionButton
              disabled={writer.locked}
              onClick={() =>
                void writer.run(
                  "Create theme version",
                  async (send, signal) => {
                    const params = { themeId: id };
                    const detail = parseWorkspaceThemeDetail(
                      await writer.api.request(
                        "workspace.themes.detail",
                        { params },
                        { signal },
                      ),
                      params,
                    );
                    if (!detail.ok)
                      throw new Error("Refresh this theme first.");
                    const latest = detail.value.versions.at(-1);
                    const created = parseWorkspaceThemeVersion(
                      await send(() =>
                        writer.api.request(
                          "workspace.themes.createVersion",
                          { params, body: {} },
                          { signal },
                        ),
                      ),
                      params,
                    );
                    if (
                      !created.ok ||
                      created.value.status !== "draft" ||
                      created.value.version !== (latest?.version ?? 0) + 1 ||
                      !sameStudioValue(
                        created.value.settings,
                        latest?.settings ?? {},
                      )
                    )
                      throw new Error("New theme version was not confirmed.");
                    unchanged(
                      created.value,
                      await readThemeVersion(
                        writer,
                        { ...params, versionId: created.value.id },
                        signal,
                      ),
                    );
                    if (!signal.aborted) {
                      setVersionId(created.value.id);
                      query.reload();
                      onCatalogChanged();
                    }
                  },
                )
              }
            >
              New theme draft version
            </ActionButton>
            <Field label="Saved theme version">
              <SelectInput
                aria-label="Saved theme version"
                value={version?.id ?? ""}
                placeholder="Choose a saved version"
                options={theme.versions.map((row) => ({
                  value: row.id,
                  label: `v${row.version} · ${row.status}`,
                }))}
                onValueChange={setVersionId}
              />
            </Field>
            {version && (
              <ThemeVersionView
                key={version.id + version.settingsHash + version.status}
                version={version}
                writer={writer}
                onChanged={() => {
                  query.reload();
                  onCatalogChanged();
                }}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function ThemeStudio({ writer }: { writer: StudioWrite }) {
  const query = useCapiroQuery("workspace.themes.list", {});
  const parsed =
    query.data === undefined ? undefined : parseWorkspaceThemeList(query.data);
  const themes: WorkspaceTheme[] = parsed?.ok ? parsed.value : [];
  const [selected, setSelected] = useState<string>(),
    [creating, setCreating] = useState(false);
  return (
    <div className={styles.fields}>
      <div className={styles.actions}>
        <h2>Document themes</h2>
        <ActionButton
          primary
          disabled={writer.locked}
          onClick={() => setCreating(true)}
        >
          New theme
        </ActionButton>
        <ActionButton
          onClick={() => {
            setSelected(undefined);
            query.reload();
          }}
        >
          Refresh themes
        </ActionButton>
      </div>
      <StatusPanel
        loading={query.loading}
        error={
          query.error || (parsed && !parsed.ok)
            ? "Could not load document themes."
            : undefined
        }
        onRetry={query.reload}
      />
      {parsed?.ok && !themes.length && <p>No document themes yet.</p>}
      <div className={catalogStyles.columns}>
        <aside className={catalogStyles.catalog} aria-label="Document themes">
          {themes.map((theme) => (
            <button
              type="button"
              key={theme.id}
              className={catalogStyles.catalogItem}
              aria-pressed={selected === theme.id}
              onClick={() => setSelected(theme.id)}
            >
              <strong>{theme.name}</strong>
              {theme.versions[0] && (
                <span>
                  Latest v{theme.versions[0].version} ·{" "}
                  {theme.versions[0].status}
                </span>
              )}
            </button>
          ))}
        </aside>
        {selected ? (
          <ThemeDetail
            key={selected}
            id={selected}
            writer={writer}
            onCatalogChanged={query.reload}
          />
        ) : (
          <p>Choose a theme to inspect its saved versions.</p>
        )}
      </div>
      {creating && (
        <ThemeCreate
          writer={writer}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setSelected(id);
            query.reload();
          }}
        />
      )}
    </div>
  );
}
