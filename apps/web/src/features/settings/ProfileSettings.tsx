"use client";

import { useState } from "react";
import { useCapiro } from "../../shared/capiro/CapiroBoundary";
import type { OperationResponse } from "../../shared/capiro/contracts";
import type { settingsOperations } from "../../shared/capiro/operations/settings";
import { useCapiroQuery } from "../../shared/capiro/queries";
import {
  Badge,
  DataTable,
  StatusPanel,
  TextArea,
  TextInput,
} from "../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsDialog,
  SettingsNotice,
  SettingsTabs,
} from "./components";
import styles from "./styles";
import { useSettingsAction } from "./useSettingsAction";

type Client = OperationResponse<
  (typeof settingsOperations)["clients.list"]
>[number];

export function ProfileSettings() {
  const api = useCapiro();
  const query = useCapiroQuery("clients.list", {
    query: { includeArchived: true },
  });
  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");
  const [archive, setArchive] = useState<Client>();
  const [create, setCreate] = useState(false);
  const action = useSettingsAction();
  async function changeStatus(
    client: Client,
    operation: "archive" | "restore",
  ) {
    const result =
      operation === "archive"
        ? await api.request("settings.profiles.archive", {
            params: { clientId: client.id },
          })
        : await api.request("settings.profiles.restore", {
            params: { clientId: client.id },
            body: { status: "active" },
          });
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
      data-design-target={tab === "active" ? "411:70958" : "411:71400"}
    >
      <div className={styles.row}>
        <div className={styles.grow}>
          <SettingsTabs
            label="Profile status"
            value={tab}
            onChange={setTab}
            items={[
              { id: "active", label: `Active (${active.length})` },
              { id: "archived", label: `Archived (${archived.length})` },
            ]}
          />
        </div>
        <TextInput
          aria-label="Search profiles"
          placeholder="Search profiles"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <SettingsButton primary onClick={() => setCreate(true)}>
          + Add profile
        </SettingsButton>
      </div>
      {action.error && (
        <SettingsNotice title="Profile update failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <div className={styles.card}>
          <DataTable
            rows={rows}
            rowKey={(row) => row.id}
            caption={`${tab} client profiles`}
            emptyMessage={
              search ? "No profiles match your search." : `No ${tab} profiles.`
            }
            columns={[
              { key: "name", label: "Name", render: (row) => row.name },
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
              { key: "owner", label: "Owner", render: () => "—" },
              {
                key: "status",
                label: "Status",
                render: (row) => (
                  <Badge tone={row.status === "active" ? "success" : "neutral"}>
                    {row.status}
                  </Badge>
                ),
              },
              {
                key: "added",
                label: "Added",
                render: (row) =>
                  row.createdAt
                    ? new Date(row.createdAt).toLocaleDateString()
                    : "—",
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) =>
                  row.status === "archived" ? (
                    <SettingsButton
                      small
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(
                          () => changeStatus(row, "restore"),
                          "Profile was restored.",
                          query.reload,
                        )
                      }
                    >
                      Restore
                    </SettingsButton>
                  ) : (
                    <SettingsButton
                      small
                      disabled={action.busy}
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
      <p className={styles.description}>
        Archived profiles leave your portfolio. Billing changes follow your
        current subscription terms. Archive and restoration are managed here.
      </p>
      <SettingsDialog
        open={!!archive}
        onClose={() => setArchive(undefined)}
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
              disabled={action.busy}
              onClick={() => {
                if (archive)
                  void action.run(
                    () => changeStatus(archive, "archive"),
                    "Profile was archived.",
                    () => {
                      setArchive(undefined);
                      query.reload();
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
      <CreateProfile
        open={create}
        onClose={() => setCreate(false)}
        refresh={query.reload}
      />
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
  const api = useCapiro();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const action = useSettingsAction();
  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
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
            disabled={action.busy}
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
            () =>
              api.request("settings.profiles.create", {
                body: {
                  name,
                  ...(website ? { website } : {}),
                  ...(description ? { description } : {}),
                },
              }),
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
            onChange={(event) => setName(event.target.value)}
          />
        </SettingField>
        <SettingField label="Website (optional)">
          <TextInput
            maxLength={2048}
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </SettingField>
        <SettingField label="Description (optional)">
          <TextArea
            maxLength={10000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </SettingField>
        {action.error && (
          <SettingsNotice title="Profile could not be created" error>
            {action.error}
          </SettingsNotice>
        )}
      </form>
    </SettingsDialog>
  );
}
