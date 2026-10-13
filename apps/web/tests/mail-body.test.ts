import { describe, expect, it } from "vitest";
import {
  plainMailBody,
  mailBodyError,
} from "../src/features/portfolio/relationships/email/mail-body";

describe("local rich mail body contract", () => {
  it("treats initial and rewritten text as literal content, including blank lines", () => {
    expect(plainMailBody('A <b>literal</b> & "quoted"\n\nLast')).toEqual({
      text: 'A <b>literal</b> & "quoted"\n\nLast',
      html: "<p>A &lt;b&gt;literal&lt;/b&gt; &amp; &quot;quoted&quot;</p><p><br></p><p>Last</p>",
    });
  });
  it("requires actual text and retains existing plain character and wire bounds", () => {
    expect(mailBodyError({ text: " \n ", html: "<p><br></p>" })).toBe(
      "Enter a message.",
    );
    expect(mailBodyError(plainMailBody("x".repeat(8000)))).toBe("");
    expect(mailBodyError(plainMailBody("x".repeat(8001)))).toBe(
      "Keep the message to 8,000 characters.",
    );
    expect(mailBodyError({ text: "x", html: "x".repeat(40000) })).toBe("");
    expect(mailBodyError({ text: "x", html: "x".repeat(40001) })).toBe(
      "The formatted message is too large. Remove some formatting or shorten it.",
    );
  });
});
