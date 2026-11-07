import type { Page } from "@playwright/test";
import { clientSchema } from "../../src/features/portfolio/index/contracts";
import {
  profileSnapshotSchema,
  type PersonProfileInput,
} from "../../src/features/portfolio/profile-build/fact-contracts";
import { client, clientId, installFixtures, json } from "./fixtures";

// Deliberately synthetic records. These are UI persistence fixtures, not claims
// about any real company's registrations, contacts, or account priorities.
export const values = {
  company: {
    "Legal name *": "Synthetic Field Coverage, Inc.",
    "Website (optional)": "https://field-coverage.example.test",
    "Company description": "Synthetic flight hardware and research services.",
    "Main company email": "office@field-coverage.example.test",
    "Main company phone": "+1 202 555 0198",
  },
  registration: {
    "CAGE Code": "1AB2C",
    UEI: "ABC123DEF456",
    "SAM.gov expiration date": "2027-10-31",
    "LDA registrant name": "Synthetic Field Registrant",
    EIN: "123456789",
  },
  site: {
    "Site name": "Synthetic engineering site",
    "Country (two-letter code)": "US",
    "Street address": "123 Synthetic Avenue, Suite 4",
    City: "Example City",
    "State or region": "VA",
    "Postal code": "22201",
  },
  leader: {
    Name: "Jordan Synthetic",
    "Role or title": "Chief Test Officer",
    "Email (optional)": "jordan@field-coverage.example.test",
  },
  capability: {
    "Capability name": "Synthetic mapping platform",
    Description: "A synthetic platform used only for field persistence tests.",
  },
  advocacy: {
    "Engagement start date": "2026-09-14",
    "Primary POC at client": "Casey Synthetic",
    "Internal notes": "Synthetic account note.\nKeep the second line.",
  },
} as const;

export const rowIds = {
  locations: "f1000000-0000-4000-8000-000000000001",
  leadership: "f2000000-0000-4000-8000-000000000001",
  capabilities: "f3000000-0000-4000-8000-000000000001",
};
const sectionRows = {
  locations: [
    {
      id: rowIds.locations,
      name: values.site["Site name"],
      role: "engineering",
      status: "operating",
      country: "US",
      addressLine: values.site["Street address"],
      city: "Example City",
      state: "VA",
      zip: "22201",
    },
  ],
  leadership: [
    {
      id: rowIds.leadership,
      name: values.leader.Name,
      title: values.leader["Role or title"],
      email: values.leader["Email (optional)"],
    },
  ],
  capabilities: [
    {
      id: rowIds.capabilities,
      name: values.capability["Capability name"],
      type: "platform",
      description: values.capability.Description,
    },
  ],
};
const completeClient = {
  ...client,
  name: values.company["Legal name *"],
  website: values.company["Website (optional)"],
  description: values.company["Company description"],
  primaryContactEmail: values.company["Main company email"],
  primaryContactPhone: values.company["Main company phone"],
  primaryContactName: values.advocacy["Primary POC at client"],
  cageCode: "1AB2C",
  uei: "ABC123DEF456",
  naicsCodes: ["541330"],
  pscCodes: ["R425"],
  applicantTypes: ["Small businesses"],
  setAsideCertifications: ["8A", "WOSB"],
  sectorTag: "COMMERCE_TECH",
  submissionTracks: ["NDAA", "ADVOCACY"],
  issueCodes: ["DEF"],
  intakeData: {
    ein: "123456789",
    samStatus: "Active",
    samExpirationDate: "2027-10-31",
    ldaRegistrantName: "Synthetic Field Registrant",
    sectors: ["COMMERCE_TECH", "DEFENSE"],
    fundingPriorities: ["Synthetic prototype funding", "Synthetic workforce"],
    engagementStartDate: "2026-09-14",
    internalNotes: values.advocacy["Internal notes"],
    sbClassification: { sb: true, wosb: true, importedFlag: true },
    profileNotes: "Separate profile note",
    unrelated: { keep: "Original sibling" },
  },
};
type Command = PersonProfileInput & {
  requestId: string;
  expectedVersion: string;
};
type Rows = Record<string, unknown>[];

/** A separate durable service model survives page reloads; GET never echoes the
 * current form or regenerates empty state as the general fixtures do. */
export async function installFieldCoverage(page: Page, complete = false) {
  const unexpected = await installFixtures(page);
  const state = {
    client: clientSchema.parse(
      complete
        ? completeClient
        : {
            ...client,
            sectorTag: null,
            setAsideCertifications: [],
          },
    ),
    profile: profileSnapshotSchema.parse({
      subject: { kind: "client", id: clientId },
      version: "a".repeat(64),
      fields: {},
      facts: [],
      conflicts: [],
      completeness: { completed: 0, total: 6, missing: [], sections: [] },
      sections: {
        locations: complete ? sectionRows.locations : [],
        leadership: complete ? sectionRows.leadership : [],
        capabilities: complete ? sectionRows.capabilities : [],
        advocacy: null,
        notes: [],
        documents: [],
      },
    }),
    creates: 0,
    clientReads: 0,
    profileReads: 0,
    clientWrites: [] as Record<string, unknown>[],
    commands: [] as Command[],
    failDetailsOnce: false,
  };
  const receipts = new Map<string, typeof state.profile>();
  let revision = 0;
  const saveRows = (key: keyof typeof rowIds, incoming?: Rows) => {
    if (!incoming) return state.profile.sections[key];
    const previous = state.profile.sections[key] as Rows;
    const rows = new Map(previous.map((row) => [String(row.id), row]));
    for (const row of incoming) {
      const id = String(
        row.id ??
          (rows.size === 0
            ? rowIds[key]
            : `f4000000-0000-4000-8000-${String(rows.size + 1).padStart(12, "0")}`),
      );
      rows.set(id, { ...rows.get(id), ...row, id });
    }
    return [...rows.values()];
  };
  await page.route("**/api/backend/core/clients", (route) => {
    if (route.request().method() === "GET") return json(route, [state.client]);
    if (route.request().method() !== "POST") return route.fallback();
    state.creates++;
    state.client = clientSchema.parse({
      ...state.client,
      ...route.request().postDataJSON(),
    });
    return json(route, state.client);
  });
  await page.route(`**/api/backend/core/clients/${clientId}`, (route) => {
    if (route.request().method() === "GET") {
      state.clientReads++;
      return json(route, state.client);
    }
    if (route.request().method() !== "PUT") return route.fallback();
    const body = route.request().postDataJSON() as Record<string, unknown>;
    state.clientWrites.push(body);
    // intakeData is deliberately replaced, not merged by the fixture. The UI
    // must submit fresh unrelated siblings or they really disappear on reload.
    state.client = clientSchema.parse({ ...state.client, ...body });
    return json(route, state.client);
  });
  await page.route(
    `**/api/backend/core/clients/${clientId}/profile-build/profile`,
    (route) => {
      if (route.request().method() === "GET") {
        state.profileReads++;
        return json(route, state.profile);
      }
      if (route.request().method() !== "PUT") return route.fallback();
      const body = route.request().postDataJSON() as Command;
      state.commands.push(body);
      if (state.failDetailsOnce) {
        state.failDetailsOnce = false;
        return json(
          route,
          { message: "Synthetic profile details temporarily unavailable" },
          503,
        );
      }
      const receipt = receipts.get(body.requestId);
      if (receipt) return json(route, receipt);
      if (body.expectedVersion !== state.profile.version)
        return json(route, { message: "Synthetic stale profile version" }, 409);
      state.profile = profileSnapshotSchema.parse({
        ...state.profile,
        version: String(++revision).padStart(64, "0"),
        fields: { ...state.profile.fields, ...body.fields },
        sections: {
          ...state.profile.sections,
          locations: saveRows("locations", body.locations),
          leadership: saveRows("leadership", body.leadership),
          capabilities: saveRows("capabilities", body.capabilities),
          advocacy: body.advocacy ?? state.profile.sections.advocacy,
        },
      });
      receipts.set(body.requestId, structuredClone(state.profile));
      return json(route, state.profile);
    },
  );
  return { state, unexpected };
}
