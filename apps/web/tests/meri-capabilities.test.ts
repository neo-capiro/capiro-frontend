import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { readMeriCapabilities } from "../src/shared/meri-resources/capabilities.server";
import {
  heldMeriCapabilities,
  meriCapabilityHref,
  meriCapabilityTable,
  resolveMeriCapabilities,
  type MeriCapabilityId,
} from "../src/shared/meri-resources/capabilities";
import {
  MeriCapabilitiesProvider,
  useMeriCapabilities,
} from "../src/shared/meri-resources/CapabilityContext";
import { unavailableResources } from "../src/shared/meri-resources/unavailable";
import {
  allCapabilitiesEnv,
  capabilityFixtureEnv,
  capabilityFlags,
  previewCapabilitiesEnv,
} from "./meri-capabilities-fixtures";

it("inventory distinguishes implemented ordinary routes from missing workspace consumers", () => {
  const state = resolveMeriCapabilities(
    Object.fromEntries(
      Object.keys(meriCapabilityTable).map((id) => [id, true]),
    ),
  );
  const routes = Object.entries(meriCapabilityTable).map(([id, entry]) => {
    expect(entry.sourcePin, id).toMatch(/^[a-f0-9]{40}$/);
    expect(entry.publicContract, id).not.toBe("");
    expect(entry.runtimeOwner, id).not.toBe("");
    expect(entry.requiredReceipt, id).not.toBe("");
    return meriCapabilityHref(id as MeriCapabilityId, state);
  });
  expect([...new Set(routes.filter(Boolean))]).toEqual([
    "/meri/conversations",
    "/meri",
    "/meri/files",
    "/meri/actions",
    "/meri/task-updates",
    "/meri/memory",
    "/settings/preferences",
    "/meri/runs",
    "/meri/approvals",
    "/meri/routines",
    "/settings/preferences?page=data-access",
  ]);
  // Every capability has an ordinary route and a deployment gate; none is explained away as missing.
  for (const [id, entry] of Object.entries(meriCapabilityTable)) {
    expect(entry.ordinaryRoute, id).not.toBeNull();
    expect(entry.deploymentFlag, id).not.toBeNull();
  }
  for (const id of ["approvals", "dataAccess"] as const)
    expect(heldMeriCapabilities[id]).toEqual({
      status: "off",
      reason: "Not enabled or not configured for this workspace.",
      navigation: "off",
    });
  expect(meriCapabilityTable.runs.publicContract).toContain("run-index/1.0.0");
  expect(JSON.stringify(meriCapabilityTable)).not.toContain("/kit");
  expect(Object.isFrozen(state)).toBe(true);
  expect(Object.isFrozen(state.conversations)).toBe(true);
});

it("all 256 flag combinations preserve operation prerequisites and existing navigation", () => {
  const ids = Object.keys(capabilityFlags) as (keyof typeof capabilityFlags)[];
  for (let bits = 0; bits < 256; bits++) {
    const flags = ids.map((_, index) => (bits & (1 << index)) !== 0);
    const env = {
      ...capabilityFixtureEnv,
      ...Object.fromEntries(
        ids.map((id, index) => [capabilityFlags[id], String(flags[index])]),
      ),
    };
    const expected = [
      flags[0],
      flags[0] && flags[1],
      flags[2],
      flags[3],
      flags[4],
      flags[0] && flags[5],
      flags[6],
      flags[7],
    ];
    const state = readMeriCapabilities(env);
    expect(state.routines.status, `${bits}:routines`).toBe(
      flags[0] ? "on" : "off",
    );
    expect(meriCapabilityHref("routines", state)).toBe("/meri/routines");
    expect(state.runs.status, `${bits}:runs`).toBe(flags[0] ? "on" : "off");
    expect(meriCapabilityHref("runs", state)).toBe(
      flags[0] ? "/meri/runs" : undefined,
    );
    ids.forEach((id, index) => {
      expect(state[id].status, `${bits}:${id}`).toBe(
        expected[index] ? "on" : "off",
      );
      expect(Boolean(meriCapabilityHref(id, state)), `${bits}:${id} link`).toBe(
        expected[index] ||
          [
            "conversations",
            "files",
            "actions",
            "taskUpdates",
            "preferences",
          ].includes(id),
      );
    });
  }
});

it("missing or invalid connection inputs never turn source availability into activation", () => {
  expect(readMeriCapabilities({})).toEqual(heldMeriCapabilities);
  for (const changes of [
    { CLERK_SECRET_KEY: undefined },
    { CLERK_SECRET_KEY: "sk_live_synthetic" },
    { CORE_API_BASE_URL: undefined },
    { CAPIRO_REQUEST_ORIGIN: "not-an-origin" },
  ]) {
    const state = readMeriCapabilities({ ...allCapabilitiesEnv, ...changes });
    for (const id of Object.keys(
      capabilityFlags,
    ) as (keyof typeof capabilityFlags)[])
      expect(state[id].status, `${JSON.stringify(changes)}:${id}`).toBe("off");
  }
  for (const value of [undefined, "false", "TRUE", " true ", "1"]) {
    const state = readMeriCapabilities({
      ...allCapabilitiesEnv,
      ...Object.fromEntries(
        Object.values(capabilityFlags).map((flag) => [flag, value]),
      ),
    });
    for (const id of Object.keys(
      capabilityFlags,
    ) as (keyof typeof capabilityFlags)[])
      expect(state[id].status, `${value}:${id}`).toBe("off");
  }
  expect(
    readMeriCapabilities({
      ...allCapabilitiesEnv,
      MERI_DOCUMENT_OPERATION: "unsupported",
    }).files.status,
  ).toBe("off");
  expect(
    readMeriCapabilities({
      ...allCapabilitiesEnv,
      CORE_API_BASE_URL: "https://core.synthetic.invalid/other",
    }).memory.status,
  ).toBe("off");
  expect(
    readMeriCapabilities({
      ...allCapabilitiesEnv,
      CAPIRO_REQUEST_ORIGIN: undefined,
    }).conversations.status,
  ).toBe("off");
});

it("preview holds are deployment reasons even when the public source and ordinary flags exist", () => {
  const state = readMeriCapabilities(previewCapabilitiesEnv);
  expect(state.conversations.status).toBe("on");
  expect(state.newConversation.status).toBe("on");
  for (const id of [
    "files",
    "actions",
    "taskUpdates",
    "conversationApprovals",
    "memory",
    "preferences",
  ] as const) {
    expect(state[id].status, id).toBe("off");
    expect(state[id].reason, id).toContain(
      "held in the current preview deployment",
    );
    expect(Boolean(meriCapabilityHref(id, state)), id).toBe(
      ["files", "actions", "taskUpdates", "preferences"].includes(id),
    );
  }
  for (const changes of [
    { CAPIRO_PREVIEW_READ_ONLY: "TRUE" },
    { CAPIRO_PREVIEW_MERI_CONVERSATION_ROUTES_ENABLED: "false" },
    { CAPIRO_PREVIEW_MERI_RUNTIME_IMAGE_DIGEST: undefined },
    { CAPIRO_PREVIEW_MERI_CONTRACT_PACKAGE_VERSION: "0.0.0" },
  ])
    expect(
      readMeriCapabilities({ ...previewCapabilitiesEnv, ...changes })
        .conversations.status,
    ).toBe("off");
  expect(
    readMeriCapabilities({
      ...previewCapabilitiesEnv,
      CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE: undefined,
    }).newConversation.status,
  ).toBe("off");
});

function CapabilityProbe() {
  const state = useMeriCapabilities();
  return createElement(
    "output",
    null,
    `${state.files.status}:${meriCapabilityHref("files", state) ?? "held"}`,
  );
}

it("the client context keeps operations held without hiding existing connection destinations", () => {
  expect(renderToStaticMarkup(createElement(CapabilityProbe))).toBe(
    "<output>off:/meri/files</output>",
  );
  const children = createElement(CapabilityProbe);
  expect(
    renderToStaticMarkup(
      createElement(
        MeriCapabilitiesProvider,
        {
          value: readMeriCapabilities(allCapabilitiesEnv),
        },
        children,
      ),
    ),
  ).toBe("<output>on:/meri/files</output>");
  expect(
    renderToStaticMarkup(
      createElement(
        MeriCapabilitiesProvider,
        {
          value: heldMeriCapabilities,
        },
        children,
      ),
    ),
  ).toBe("<output>off:/meri/files</output>");
});

it("unavailable copy preserves source reception and does not claim personal preferences are unstored", () => {
  expect(unavailableResources.runs.missing).toContain(
    "conversation-lifecycle/0.1.0 already exports",
  );
  expect(unavailableResources.runs.summary).not.toContain("Stop are shown");
  expect(unavailableResources.newConversation.missing).toContain(
    "idempotent new-conversation consumer already exists",
  );
  expect(unavailableResources.conversationHistory.missing).toContain(
    "published conversation transcript",
  );
  expect(unavailableResources.memory.missing).toContain(
    "personal owner-memory review route already exists",
  );
  expect(unavailableResources.preferences.summary).toContain(
    "can be saved when their connection is enabled",
  );
  expect(unavailableResources.preferences.summary).not.toMatch(
    /nothing is (saved|stored)/i,
  );
});

it("new conversation capability does not require a configured client", () => {
  expect(readMeriCapabilities(allCapabilitiesEnv).newConversation.status).toBe(
    "on",
  );
  expect(
    readMeriCapabilities(previewCapabilitiesEnv).newConversation.status,
  ).toBe("on");
});
