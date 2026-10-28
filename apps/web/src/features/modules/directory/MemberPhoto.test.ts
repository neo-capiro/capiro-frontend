import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MemberPhoto } from "./MemberPhoto";

it("renders the Core member photo when the directory contact carries one", () => {
  const html = renderToStaticMarkup(
    createElement(MemberPhoto, {
      name: "Rep. Mike Fallon",
      photoUrl: "https://assets.example.test/directory/member.png",
    }),
  );
  expect(html).toContain("<img");
  expect(html).toContain('src="https://assets.example.test/directory/member.png"');
  // The name is rendered next to the photo, so the image stays decorative.
  expect(html).toContain('alt=""');
});

it("falls back to initials when no photo is retained", () => {
  const html = renderToStaticMarkup(
    createElement(MemberPhoto, { name: "Rep. Mike Fallon", photoUrl: null }),
  );
  expect(html).not.toContain("<img");
  expect(html).toContain("MF");
  expect(html).toContain('aria-hidden="true"');
});

it("falls back to initials for an empty photo address", () => {
  const html = renderToStaticMarkup(
    createElement(MemberPhoto, { name: "Rep. Mike Fallon", photoUrl: "" }),
  );
  expect(html).not.toContain("<img");
  expect(html).toContain("MF");
});
