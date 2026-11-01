import { expect, it } from "vitest";
import {
  buildIdentityLine,
  readBuildIdentity,
} from "../src/shared/build/build-identity.server";

const frontend = "1234567890abcdef1234567890abcdef12345678";
const core = "abcdef1234567890abcdef1234567890abcdef12";
const meri = "fedcba0987654321fedcba0987654321fedcba09";

it("prints the frontend commit always and Core/Meri only when configured", () => {
  expect(buildIdentityLine(readBuildIdentity({ GIT_SHA: frontend }))).toBe(
    "frontend 12345678",
  );
  expect(
    buildIdentityLine(
      readBuildIdentity({
        GIT_SHA: ` ${frontend} `,
        CAPIRO_PREVIEW_READ_BACKEND_SOURCE: core,
        CAPIRO_PREVIEW_MEMORY_CORE_BACKEND_SOURCE: core,
        CAPIRO_PREVIEW_MERI_RUNTIME_SOURCE: meri,
      }),
    ),
  ).toBe("frontend 12345678 · core abcdef12 · meri fedcba09");
  expect(
    buildIdentityLine(
      readBuildIdentity({
        GIT_SHA: frontend,
        CAPIRO_PREVIEW_READ_BACKEND_SOURCE: core,
        CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE: meri,
        CAPIRO_PREVIEW_MERI_RUNTIME_SOURCE: "",
      }),
    ),
  ).toBe("frontend 12345678 · core abcdef12/fedcba09");
});

it("prints nothing when the image did not record its commit", () => {
  expect(buildIdentityLine(readBuildIdentity({}))).toBeNull();
  expect(
    buildIdentityLine(
      readBuildIdentity({
        GIT_SHA: "  ",
        CAPIRO_PREVIEW_MERI_RUNTIME_SOURCE: meri,
      }),
    ),
  ).toBeNull();
});
