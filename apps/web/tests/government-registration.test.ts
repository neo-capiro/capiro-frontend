import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GovernmentRegistration } from "../src/features/portfolio/client-profile/GovernmentRegistration";
import type { Client } from "../src/features/portfolio/index/public";

const client: Client = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Synthetic saved organization",
  profileStatus: "ACTIVE",
  status: "active",
  cageCode: "1ABC2",
  uei: "ABC123DEF456",
  naicsCodes: ["541330", "541512"],
  pscCodes: ["R425", "AC12"],
  applicantTypes: ["Small businesses", "Legacy organization"],
  setAsideCertifications: ["HUBZONE", "Legacy certification"],
  submissionTracks: ["NDAA", "Legacy track"],
  issueCodes: ["BUD", "DEF"],
  sectorTag: "DEFENSE",
  intakeData: {
    samStatus: "Pending",
    samExpirationDate: "2027-06-14",
    ldaRegistrantName: "Synthetic registrant",
    ein: "123456789",
    cageCode: "STALE",
    uei: "STALE0000000",
    sectors: ["DEFENSE", "Legacy sector"],
  },
};
const render = (value = client) =>
  renderToStaticMarkup(
    createElement(GovernmentRegistration, { client: value }),
  );
const facts = (html: string) =>
  Object.fromEntries(
    Array.from(
      html.matchAll(/<dt>(.*?)<\/dt><dd>(.*?)<\/dd>/gs),
      ([, label, value]) => [label!, value!.replace(/<[^>]+>/g, "")],
    ),
  );

describe("Saved government identity and registration presentation", () => {
  it("preserves all thirteen saved fields, canonical catalog labels and unknown values", () => {
    const before = JSON.stringify(client);
    const html = render();
    expect(facts(html)).toEqual({
      "SAM.gov status": "Pending",
      "SAM.gov expiration": "2027-06-14",
      "CAGE code": "1ABC2",
      UEI: "ABC123DEF456",
      "LDA registrant": "Synthetic registrant",
      EIN: "123456789",
      NAICS: "541330541512",
      PSC: "R425AC12",
      "Organization types": "Small businessLegacy organization",
      "Federal set-aside certifications": "HUBZONELegacy certification",
      Sector: "Defense · primaryLegacy sector",
      "Active tracks": "NDAA Authorization RequestLegacy track",
      "LDA issue codes": "BUDDEF",
    });
    expect(html).toContain('aria-label="Registration"');
    expect(html).toContain('aria-label="Sector and tracks"');
    expect(html).toContain(
      "External registration status is not verified here.",
    );
    expect(html).not.toContain("STALE");
    expect(JSON.stringify(client)).toBe(before);
  });

  it("retains canonical legacy identifier and sector fallbacks without normalizing saved values", () => {
    const values = facts(
      render({
        ...client,
        cageCode: null,
        uei: undefined,
        sectorTag: "Legacy fallback sector",
        intakeData: { cageCode: "old-1", uei: "legacy-uei" },
      }),
    );
    expect(values["CAGE code"]).toBe("old-1");
    expect(values.UEI).toBe("legacy-uei");
    expect(values.Sector).toBe("Legacy fallback sector · primary");
  });

  it("keeps all field labels and Not provided behavior for an otherwise empty saved client", () => {
    const values = facts(
      render({
        id: client.id,
        name: client.name,
        profileStatus: client.profileStatus,
        status: client.status,
        cageCode: null,
        uei: null,
        intakeData: null,
      }),
    );
    expect(Object.keys(values)).toHaveLength(13);
    expect(new Set(Object.values(values))).toEqual(new Set(["Not provided"]));
  });
});
