import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { DirectoryPagination } from "../src/features/modules/directory/DirectoryPagination";

vi.mock("../src/shared/module-ui", () => ({
  ActionButton: ({
    children,
    disabled,
    onClick,
  }: {
    children?: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => createElement("button", { disabled, onClick }, children),
}));

function render(props: {
  page: number;
  total: number;
  pageSize: number;
  shown?: number;
  hasMore?: boolean;
}) {
  return renderToStaticMarkup(
    createElement(DirectoryPagination, { ...props, onPage: () => undefined }),
  );
}

function button(html: string, label: string) {
  return html.match(new RegExp(`<button[^>]*>${label}</button>`))?.[0] ?? "";
}

it("does not print a false ceiling when an endpoint clamps total to the page", () => {
  const html = render({
    page: 1,
    total: 25,
    pageSize: 25,
    shown: 25,
    hasMore: true,
  });
  expect(html).toContain("Showing 1 to 25");
  expect(html).not.toContain("of 25");
  expect(button(html, "Next")).not.toContain("disabled");
});

it("prints the real total and disables Next on the last page", () => {
  const html = render({
    page: 2,
    total: 50,
    pageSize: 25,
    shown: 25,
    hasMore: false,
  });
  expect(html).toContain("Showing 26 to 50 of 50");
  expect(button(html, "Next")).toContain("disabled");
});

it("reports an empty page without inventing rows", () => {
  const html = render({
    page: 1,
    total: 0,
    pageSize: 25,
    shown: 0,
    hasMore: false,
  });
  expect(html).toContain("No records");
  expect(button(html, "Next")).toContain("disabled");
});
