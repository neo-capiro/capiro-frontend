import { expect, it } from "vitest";
import { calendarEvents } from "../src/features/modules/intelligence/legiwatch/hearings/calendar-events";
import { officialMedia } from "../src/features/modules/intelligence/legiwatch/hearings/official-media";
import {
  federalHearing,
  floridaHearing,
} from "../test/browser/hearing-fixtures";

it("keeps both official IDs in the same calendar and preserves precise starts", () => {
  const rows = calendarEvents([
    { ...federalHearing, startsAt: "2026-11-02T15:37:00Z" },
    {
      ...floridaHearing,
      date: "2026-11-02",
      startsAt: null,
      time: "1:45 PM",
      timezone: "America/New_York",
    },
  ]);
  expect(rows.map((row) => row.id)).toEqual([
    federalHearing.id,
    floridaHearing.id,
  ]);
  expect(rows.map((row) => row.calendarId)).toEqual(["US", "FL"]);
  expect(rows[0].start.toString()).toContain("10:37:00-05:00");
  expect(rows[1].start.toString()).toContain("13:45:00-05:00");
});

it("keeps unknown time on the official calendar date without inventing a start", () => {
  const [row] = calendarEvents([
    { ...floridaHearing, date: "2026-11-02", startsAt: null, time: null },
  ]);
  expect(row.start.toString()).toBe("2026-11-02");
  expect(row.title).toContain("Florida · Time TBA");
});

it("preserves published hour-only times and rejects invalid clock values", () => {
  for (const [time, hour] of [
    ["10 AM", "10"],
    ["2 PM", "14"],
    ["10", "10"],
  ]) {
    const [row] = calendarEvents([
      { ...federalHearing, startsAt: null, time: time! },
    ]);
    expect(row!.start.toString()).toContain(`T${hour}:00`);
  }
  for (const time of ["25:00", "13 PM", "10:75"]) {
    const [row] = calendarEvents([{ ...federalHearing, startsAt: null, time }]);
    expect(row!.title).toContain("Time TBA");
  }
});

it("rejects local network media destinations before metadata requests", () => {
  for (const host of [
    "127.0.0.1",
    "10.1.2.3",
    "[::1]",
    "localhost",
    "printer.local",
    "video.internal",
    "localhost.",
    "printer.local.",
    "video.home.arpa.",
  ])
    expect(officialMedia(`https://${host}/hearing.mp4`).kind).toBe(
      "unavailable",
    );
});

it("supports supplied archived media without a live-status restriction", () => {
  expect(
    officialMedia(
      "https://official.example/archive/hearing.mp4?token=synthetic",
    ),
  ).toMatchObject({ kind: "video", type: "video/mp4" });
  expect(
    officialMedia("https://official.example/live/index.m3u8"),
  ).toMatchObject({ kind: "video", type: "application/vnd.apple.mpegurl" });
  expect(
    officialMedia("https://official.example/archive/hearing.webm"),
  ).toMatchObject({ kind: "video", type: "video/webm" });
});

it("does not treat a listing, embed page or guessed stream as playable media", () => {
  for (const source of [
    "https://official.example/video/123",
    "https://official.example/?video=stream.mp4",
    "https://www.youtube.com/watch?v=synthetic",
  ])
    expect(officialMedia(source).kind).toBe("link");
  for (const source of [
    null,
    "javascript:alert(1)",
    "https://user:password@official.example/video.mp4",
    "http://official.example/video.mp4",
    "https://official.example:8443/video.mp4",
  ])
    expect(officialMedia(source).kind).toBe("unavailable");
});
