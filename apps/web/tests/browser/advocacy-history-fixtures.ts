import type { Page, Route } from "@playwright/test";
import { installFixtures, json } from "./fixtures";
import {
  advocacyClientId,
  advocacyMatter,
  advocacyOther,
  advocacyEvents,
} from "../advocacy-history-fixtures";

export async function advocacyEvent(
  page: Page,
  kind: string,
  detail?: unknown,
) {
  await page.evaluate(
    ({ kind, detail }) =>
      window.dispatchEvent(
        new CustomEvent(`advocacy-test-${kind}`, { detail }),
      ),
    { kind, detail },
  );
}
export function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
export async function installAdvocacyHistory(page: Page) {
  const unexpected = await installFixtures(page);
  const state = {
    matters: structuredClone([advocacyMatter, advocacyOther]),
    events: structuredClone(advocacyEvents),
    listStatus: 200,
    timelineStatus: 200,
    detailStatus: 200,
    wrongDetail: false,
    listGate: null as Promise<void> | null,
    detailGate: null as Promise<void> | null,
    gatedLists: 0,
    gatedDetails: 0,
    completedLists: 0,
    completedDetails: 0,
    reads: [] as string[],
    writes: [] as {
      method: string;
      path: string;
      body: Record<string, unknown>;
    }[],
    write: null as ((route: Route) => Promise<void>) | null,
  };
  function apply(route: Route) {
    const input = route.request().postDataJSON() as {
      title: string;
      summary: string;
      status: string;
    };
    const id = new URL(route.request().url()).pathname.split("/").pop();
    state.matters = state.matters.map((matter) =>
      matter.id === id
        ? {
            ...matter,
            title: input.title,
            summary: input.summary,
            status: input.status,
            updatedAt: "2026-10-11T12:00:00Z",
          }
        : matter,
    );
  }
  await page.route(
    "**/api/backend/core/clients/*/advocacy-matters**",
    async (route) => {
      const url = new URL(route.request().url());
      const scope = url.pathname.split("/clients/")[1]?.split("/")[0];
      const path = url.pathname.split("/advocacy-matters")[1] ?? "";
      if (scope !== advocacyClientId)
        return json(
          route,
          { message: "Other client has no synthetic Advocacy source" },
          404,
        );
      if (route.request().method() === "GET") {
        state.reads.push(path);
        if (!path) {
          if (state.listGate) {
            state.gatedLists++;
            await state.listGate;
            state.completedLists++;
          }
          return json(
            route,
            state.listStatus === 200
              ? state.matters
              : { message: "Synthetic matter list unavailable" },
            state.listStatus,
          ).catch(() => {});
        }
        if (path === "/timeline")
          return json(
            route,
            state.timelineStatus === 200
              ? state.events
              : { message: "Synthetic timeline unavailable" },
            state.timelineStatus,
          );
        if (state.detailGate) {
          state.gatedDetails++;
          await state.detailGate;
          state.completedDetails++;
        }
        const matter = state.wrongDetail
          ? advocacyOther
          : state.matters.find((item) => item.id === path.slice(1));
        return json(
          route,
          state.detailStatus === 200 && matter
            ? matter
            : { message: "Synthetic matter detail unavailable" },
          matter ? state.detailStatus : 404,
        ).catch(() => {});
      }
      state.writes.push({
        method: route.request().method(),
        path,
        body: route.request().postDataJSON(),
      });
      if (state.write) return state.write(route);
      apply(route);
      return route.fulfill({ status: 204, body: "" });
    },
  );
  return { state, unexpected, apply };
}
