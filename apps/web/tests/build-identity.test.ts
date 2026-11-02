import { expect, it } from "vitest";
import {
  buildIdentityLine,
  readBuildIdentity,
} from "../src/shared/build/build-identity.server";

const frontend = "1234567890abcdef1234567890abcdef12345678";

it("prints the frontend commit only, never the configured Core or Meri sources", () => {
  expect(buildIdentityLine(readBuildIdentity({ GIT_SHA: frontend }))).toBe(
    "frontend 12345678",
  );
  expect(
    buildIdentityLine(
      readBuildIdentity({
        GIT_SHA: ` ${frontend} `,
        CAPIRO_PREVIEW_READ_BACKEND_SOURCE: "abcdef1234567890abcdef12",
        CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE: "abcdef1234567890abcdef12",
        CAPIRO_PREVIEW_MERI_RUNTIME_SOURCE: "fedcba0987654321fedcba09",
      }),
    ),
  ).toBe("frontend 12345678");
});

it("prints nothing when the image did not record its commit", () => {
  expect(buildIdentityLine(readBuildIdentity({}))).toBeNull();
  expect(buildIdentityLine(readBuildIdentity({ GIT_SHA: "  " }))).toBeNull();
});
