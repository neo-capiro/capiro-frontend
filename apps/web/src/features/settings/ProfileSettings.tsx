"use client";

import { useState } from "react";
import type { OperationResponse } from "../../shared/capiro/contracts";
import type { settingsOperations } from "../../shared/capiro/operations/settings";
import { useCapiroQuery } from "../../shared/capiro/queries";
import {
  DataTable,
  StatusPanel,
  TextArea,
  TextInput,
} from "../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsBadge,
  SettingsDialog,
  SettingsNotice,
  SettingsTabs,
} from "./components";
import styles from "./styles";
import { useSettingsMutation } from "./useSettingsMutation";
import { SettingsMutationNotice } from "./SettingsMutationNotice";

type Client = OperationResponse<
  (typeof settingsOperations)["clients.list"]
>[number];
const addedDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function ProfileSettings({
  readOnlyPreview = false,
}: {
  readOnlyPreview?: boolean;
}) {
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("profiles");
  const query = useCapiroQuery("clients.list", {
    query: { includeArchived: !readOnlyPreview },
  });
  const [tab, setTab] = useState("active");
  const owners = useCapiroQuery(
    "settings.profiles.accountOwners",
    {},
    { enabled: !readOnlyPreview && tab === "active" },
  );
  const [search, setSearch] = useState("");
  const [archive, setArchive] = useState<Client>();
  const [create, setCreate] = useState(false);
  const reload = () => {
    query.reload();
    owners.reload();
  };
  async function changeStatus(
    client: Client,
    operation: "archive" | "restore",
    signal: AbortSignal,
  ) {
    if (readOnlyPreview) return;
    const result =
      operation === "archive"
        ? await api.request(
            "settings.profiles.archive",
            {
              params: { clientId: client.id },
            },
            { signal },
          )
        : await api.request(
            "settings.profiles.restore",
            {
              params: { clientId: client.id },
              body: { status: "active" },
            },
            { signal },
          );
    if (
      result.id !== client.id ||
      result.status !== (operation === "archive" ? "archived" : "active")
    )
      throw new Error(
        "The response did not confirm this profile update. Reload profiles to confirm the result.",
      );
    return result;
  }
  const clients: Client[] = query.data ?? [];
  const active = clients.filter((client) => client.status !== "archived");
  const archived = clients.filter((client) => client.status === "archived");
  const rows = (tab === "active" ? active : archived).filter((client) =>
    client.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <div
      className={styles.stack}
      data-design-target={tab === "active" ? "1064:244975" : "411:71400"}
    >
      <div className={styles.row}>
        <div className={styles.grow}>
          <SettingsTabs
            label="Profile status"
            value={tab}
            onChange={setTab}
            items={[
              { id: "active", label: `Active (${active.length})` },
              ...(!readOnlyPreview
                ? [{ id: "archived", label: `Archived (${archived.length})` }]
                : []),
            ]}
          />
        </div>
        <div className={styles.profileSearch}>
          <TextInput
            aria-label="Search profiles"
            placeholder="Search profiles"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <SettingsButton
          primary
          disabled={readOnlyPreview || locked}
          onClick={() => setCreate(true)}
        >
          + Add profile
        </SettingsButton>
      </div>
      {readOnlyPreview && (
        <SettingsNotice title="Active profiles only in preview">
          Archived profiles, account-owner details and profile changes are
          unavailable in this mode.
        </SettingsNotice>
      )}
      {action.error && (
        <SettingsNotice title="Profile update failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <SettingsMutationNotice
        pending={pending}
        busy={action.busy}
        reconcile={reconcile}
      />
      {owners.error && tab === "active" && (
        <SettingsNotice
          title="Account owners unavailable"
          error
          retry={owners.reload}
        >
          Profile actions remain available. Reload to show account owners.
        </SettingsNotice>
      )}
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <div className={`${styles.card} ${styles.profileTable}`}>
          <DataTable
            rows={rows}
            rowKey={(row) => row.id}
            caption={`${tab} client profiles`}
            emptyMessage={
              search ? "No profiles match your search." : `No ${tab} profiles.`
            }
            columns={[
              {
                key: "name",
                label: "Name",
                render: (row) => {
                  const words = row.name.trim().split(/\s+/);
                  const initials =
                    words.length > 1
                      ? `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`
                      : row.name.slice(0, 2);
                  return (
                    <span className={styles.profileIdentity}>
                      <span
                        className={`${styles.profileAvatar} ${row.status === "prospect" ? styles.profileAvatarMuted : ""}`}
                        aria-hidden="true"
                      >
                        {row.logoUrl ? (
                          <img src={row.logoUrl} alt="" />
                        ) : (
                          initials.toUpperCase()
                        )}
                      </span>
                      <span>{row.name}</span>
                    </span>
                  );
                },
              },
              {
                key: "website",
                label: "Website",
                render: (row) => row.website ?? "—",
              },
              {
                key: "contact",
                label: "Primary contact",
                render: (row) =>
                  row.primaryContactName ?? row.primaryContactEmail ?? "—",
              },
              {
                key: "owner",
                label: "Owner",
                render: (row) => {
                  const owner =
                    row.status === "archived"
                      ? null
                      : owners.data?.[row.id]?.accountOwner;
                  if (!owner) return "—";
                  const name =
                    [owner.firstName, owner.lastName]
                      .filter(Boolean)
                      .join(" ") || owner.email;
                  const initials =
                    [owner.firstName?.[0], owner.lastName?.[0]]
                      .filter(Boolean)
                      .join("") || name.slice(0, 2);
                  return (
                    <span
                      className={styles.ownerAvatar}
                      role="img"
                      aria-label={`Account owner: ${name}`}
                      title={name}
                    >
                      {initials.toUpperCase()}
                    </span>
                  );
                },
              },
              {
                key: "status",
                label: "Status",
                render: (row) => (
                  <SettingsBadge
                    tone={
                      row.status === "active"
                        ? "success"
                        : row.status === "prospect"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {row.status.replace(/^./, (character) =>
                      character.toUpperCase(),
                    )}
                  </SettingsBadge>
                ),
              },
              {
                key: "added",
                label: "Added",
                render: (row) =>
                  row.createdAt
                    ? addedDate.format(new Date(row.createdAt))
                    : "—",
              },
              {
                key: "actions",
                label: "Actions",
                visuallyHiddenHeader: true,
                render: (row) =>
                  readOnlyPreview ? null : row.status === "archived" ? (
                    <SettingsButton
                      small
                      disabled={locked}
                      onClick={() =>
                        void action.run(
                          (signal) => changeStatus(row, "restore", signal),
                          "Profile was restored.",
                          reload,
                        )
                      }
                    >
                      Restore
                    </SettingsButton>
                  ) : (
                    <SettingsButton
                      small
                      disabled={locked}
                      onClick={() => setArchive(row)}
                    >
                      Archive
                    </SettingsButton>
                  ),
              },
            ]}
          />
        </div>
      </StatusPanel>
      {!readOnlyPreview && (
        <p className={styles.description}>
          Archived profiles leave your portfolio. Billing changes follow your
          current subscription terms. Archive and restoration are managed here.
        </p>
      )}
      <SettingsDialog
        open={!!archive}
        busy={action.busy}
        onClose={() => {
          if (!action.busy) setArchive(undefined);
        }}
        title={`Archive ${archive?.name ?? "profile"}?`}
        description="It leaves your portfolio and stops appearing in active lists. Its data is kept."
        footer={
          <>
            <SettingsButton
              disabled={action.busy}
              onClick={() => setArchive(undefined)}
            >
              Cancel
            </SettingsButton>
            <SettingsButton
              danger
              disabled={locked}
              onClick={() => {
                if (archive)
                  void action.run(
                    (signal) => changeStatus(archive, "archive", signal),
                    "Profile was archived.",
                    () => {
                      setArchive(undefined);
                      reload();
                    },
                  );
              }}
            >
              Archive
            </SettingsButton>
          </>
        }
      >
        <p className={styles.description}>
          Review your billing plan for when capacity and charges change.
        </p>
        {action.error && (
          <SettingsNotice title="Archive failed" error>
            {action.error}
          </SettingsNotice>
        )}
      </SettingsDialog>
      {!readOnlyPreview && (
        <CreateProfile
          open={create}
          onClose={() => setCreate(false)}
          refresh={reload}
        />
      )}
    </div>
  );
}

function CreateProfile({
  open,
  onClose,
  refresh,
}: {
  open: boolean;
  onClose: () => void;
  refresh: () => void;
}) {
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("profile-create");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  return (
    <SettingsDialog
      open={open}
      busy={action.busy}
      onClose={() => {
        if (!action.busy) onClose();
      }}
      title="Add profile"
      description="Create a client profile in your current workspace."
      footer={
        <>
          <SettingsButton onClick={onClose} disabled={action.busy}>
            Cancel
          </SettingsButton>
          <SettingsButton
            primary
            form="settings-create-profile"
            type="submit"
            disabled={locked}
          >
            {action.busy ? "Creating…" : "Create profile"}
          </SettingsButton>
        </>
      }
    >
      <form
        id="settings-create-profile"
        className={styles.stack}
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(
            (signal) =>
              api.request(
                "settings.profiles.create",
                {
                  body: {
                    name,
                    ...(website ? { website } : {}),
                    ...(description ? { description } : {}),
                  },
                },
                { signal },
              ),
            "Profile was created.",
            () => {
              refresh();
              onClose();
              setName("");
              setWebsite("");
              setDescription("");
            },
          );
        }}
      >
        <SettingField label="Name">
          <TextInput
            required
            maxLength={200}
            value={name}
            disabled={locked}
            onChange={(event) => setName(event.target.value)}
          />
        </SettingField>
        <SettingField label="Website (optional)">
          <TextInput
            maxLength={2048}
            value={website}
            disabled={locked}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </SettingField>
        <SettingField label="Description (optional)">
          <TextArea
            maxLength={10000}
            value={description}
            disabled={locked}
            onChange={(event) => setDescription(event.target.value)}
          />
        </SettingField>
        {action.error && (
          <SettingsNotice title="Profile could not be created" error>
            {action.error}
          </SettingsNotice>
        )}
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
      </form>
    </SettingsDialog>
  );
}
