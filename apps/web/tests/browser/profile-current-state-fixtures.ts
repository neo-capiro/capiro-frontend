import type { Page, Route } from "@playwright/test";
import {
  installFixtures,
  installUnavailableLocationReads,
  json,
} from "./fixtures";
import type { Facility } from "../../src/features/portfolio/client-profile/contracts";
import type { OrderedOwners } from "../../src/features/portfolio/client-profile/ordered-owners";
import {
  profileClient,
  profileClientId,
  profileFacility,
  profileIdentity,
  profileMembers,
  profileTeam,
  profileOwners,
} from "../profile-current-state-fixtures";

export async function installProfileCurrentState(page: Page) {
  const unexpected = await installFixtures(page);
  const state = {
    client: profileClient,
    team: [...profileTeam],
    owners: structuredClone(profileOwners) as OrderedOwners,
    members: [...profileMembers],
    facilities: [{ ...profileFacility }] as Facility[],
    clientStatus: 200,
    teamStatus: 200,
    ownersStatus: 200,
    membersStatus: 200,
    facilitiesStatus: 200,
    reads: { client: 0, team: 0, owners: 0, members: 0, facilities: 0 },
    writes: [] as { path: string; method: string; body: unknown }[],
    write: async (route: Route) =>
      json(route, { message: "Synthetic write refused" }, 403),
  };
  await page.route("**/api/backend/core/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      "/api/backend/core/",
      "",
    );
    const method = route.request().method();
    if (method !== "GET") {
      state.writes.push({
        path,
        method,
        body: route.request().postData()
          ? route.request().postDataJSON()
          : null,
      });
      return state.write(route);
    }
    if (path === "me") return json(route, profileIdentity);
    if (path === "client-account-owners/options") {
      state.reads.members++;
      return json(
        route,
        state.membersStatus === 200
          ? state.members
          : { message: "Member options unavailable" },
        state.membersStatus,
      );
    }
    if (/^clients\/[^/]+$/.test(path)) {
      state.reads.client++;
      return json(
        route,
        state.clientStatus === 200
          ? { ...state.client, id: path.split("/")[1] }
          : { message: "Client unavailable" },
        state.clientStatus,
      );
    }
    if (path.endsWith("/team")) {
      state.reads.team++;
      return json(
        route,
        state.teamStatus === 200
          ? state.team
          : { message: "Roster unavailable" },
        state.teamStatus,
      );
    }
    if (path.endsWith("/account-owners")) {
      state.reads.owners++;
      return json(
        route,
        state.ownersStatus === 200
          ? { ...state.owners, clientId: path.split("/")[1] }
          : { message: "Owners unavailable" },
        state.ownersStatus,
      );
    }
    if (path.endsWith("/facilities")) {
      state.reads.facilities++;
      return json(
        route,
        state.facilitiesStatus === 200
          ? state.facilities.map((row) => ({
              ...row,
              clientId: path.split("/")[1],
            }))
          : { message: "Facilities unavailable" },
        state.facilitiesStatus,
      );
    }
    if (path === `clients/${profileClientId}/representation`)
      return json(route, []);
    return route.fallback();
  });
  await installUnavailableLocationReads(
    page,
    profileClientId,
    undefined,
    unexpected,
  );
  return { state, unexpected };
}
export async function profileEvent(page: Page, name: string, detail?: unknown) {
  await page.evaluate(
    ({ name, detail }) =>
      window.dispatchEvent(new CustomEvent(`profile-test-${name}`, { detail })),
    { name, detail },
  );
}
