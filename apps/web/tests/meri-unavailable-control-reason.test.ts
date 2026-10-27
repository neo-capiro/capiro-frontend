import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { UnavailableControlReason } from "../src/shared/shell/UnavailableControlReason";
import { SidebarDestinations } from "../src/shared/shell/SidebarDestinations";
import { LiveNewConversation } from "../src/shared/shell/LiveNewConversation";
import { SessionContext } from "../src/shared/session/SessionContext";
import { MeriCapabilitiesProvider } from "../src/shared/meri-resources/CapabilityContext";
import { heldMeriCapabilities } from "../src/shared/meri-resources/capabilities";
import { MeriHome } from "../src/features/meri/MeriHome";

vi.mock("next/navigation", () => ({
  usePathname: () => "/meri",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => ({ isSuccess: false, isFetching: false }),
}));
vi.mock("../src/features/meri/MeriClientSelector", () => ({
  MeriClientSelector: () => null,
}));
vi.mock("../src/features/meri/conversation/MeriConversationHost", () => ({
  MeriConversationHost: () => null,
}));

const buttons = (html: string) =>
  html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
const openTag = (html: string) => html.slice(0, html.indexOf(">") + 1);
const reason = "This workspace does not have a current run index.";
const blocked = (label = "Runs") =>
  createElement(
    UnavailableControlReason,
    { label, reason },
    createElement("button", { type: "button", disabled: true }, label),
  );

it("associates the canonical reason and exposes a separate keyboard-focusable explanation without enabling the action", () => {
  const html = renderToStaticMarkup(blocked());
  const [action, explanation] = buttons(html);
  expect(action).toMatch(/\sdisabled=""/);
  expect(action).toContain(">Runs</button>");
  expect(explanation).toContain('type="button"');
  expect(explanation).toContain(`aria-label="Runs unavailable. ${reason}"`);
  expect(openTag(explanation!)).not.toMatch(/\sdisabled(?:=|\s|>)/);
  expect(openTag(explanation!)).not.toContain('tabindex="-1"');
  expect(buttons(html)).toHaveLength(2);
  for (const button of buttons(html))
    expect(button.match(/<button\b/g)).toHaveLength(1);
  const describedBy = html.match(
    /role="group"[^>]*aria-describedby="([^"]+)"/,
  )?.[1];
  expect(describedBy).toBeDefined();
  expect(html).toContain(
    `<span id="${describedBy}" hidden="">${reason}</span>`,
  );
});

it("keeps explanation IDs distinct when the same control is mounted twice", () => {
  const html = renderToStaticMarkup(
    createElement("div", null, blocked(), blocked()),
  );
  const ids = [
    ...html.matchAll(/role="group"[^>]*aria-describedby="([^"]+)"/g),
  ].map((match) => match[1]);
  expect(ids).toHaveLength(2);
  expect(new Set(ids).size).toBe(2);
});

it("adds no wrapper or explanation to an available action", () => {
  const html = renderToStaticMarkup(
    createElement(
      UnavailableControlReason,
      { label: "Files" },
      createElement("button", { type: "button" }, "Files"),
    ),
  );
  expect(html).toBe('<button type="button">Files</button>');
});

it("the real sidebar retains disabled destinations and their exact capability reasons while keeping admitted navigation enabled", () => {
  const html = renderToStaticMarkup(
    createElement(
      MeriCapabilitiesProvider,
      { value: heldMeriCapabilities },
      createElement(SidebarDestinations, { assetSet: "home", fixture: false }),
    ),
  );
  for (const label of ["Runs", "Approvals", "Data access"]) {
    const action = buttons(html).find((button) =>
      button.endsWith(`${label}</button>`),
    );
    expect(action, label).toMatch(/\sdisabled=""/);
    expect(html).toContain(`aria-label="${label} unavailable.`);
  }
  for (const label of ["Files", "Conversations"]) {
    const action = buttons(html).find((button) =>
      button.endsWith(`${label}</button>`),
    );
    expect(action, label).toBeDefined();
    expect(openTag(action!)).not.toMatch(/\sdisabled(?:=|\s|>)/);
  }
  expect(html).toContain(heldMeriCapabilities.runs.reason);
  expect(html).toContain(heldMeriCapabilities.approvals.reason);
  expect(html).toContain(heldMeriCapabilities.dataAccess.reason);
});

it("the signed-out new-conversation action stays native-disabled beside an enabled explanation", () => {
  const html = renderToStaticMarkup(
    createElement(
      SessionContext.Provider,
      { value: "signed-out" },
      createElement(LiveNewConversation, {
        assetSet: "home",
        conversationEnabled: true,
        firstChatBootstrapEnabled: true,
      }),
    ),
  );
  const [action, explanation] = buttons(html);
  expect(action).toMatch(/\sdisabled=""/);
  expect(action).toContain("New conversation");
  expect(explanation).toContain('aria-label="New conversation unavailable.');
  expect(openTag(explanation!)).not.toMatch(/\sdisabled(?:=|\s|>)/);
});

it("the real home shows the existing unavailable reason as associated visible text, with no replacement navigation", () => {
  const html = renderToStaticMarkup(
    createElement(
      MeriCapabilitiesProvider,
      { value: heldMeriCapabilities },
      createElement(MeriHome, { memoryReviewEnabled: true }),
    ),
  );
  const memory = buttons(html).find((button) =>
    button.endsWith("Review personal memory</button>"),
  );
  expect(memory).toMatch(/\sdisabled=""/);
  const describedBy = memory?.match(/aria-describedby="([^"]+)"/)?.[1];
  expect(describedBy).toBeDefined();
  expect(html).toContain(
    `<small id="${describedBy}">${heldMeriCapabilities.memory.reason}</small>`,
  );
  expect(html).not.toContain('href="/meri/memory"');
  expect(html).toContain('href="/meri/files"');
});
