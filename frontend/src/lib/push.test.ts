import { describe, expect, it } from "vitest";
import {
  activeReminders,
  prefsWithDefaults,
  urlBase64ToUint8Array,
  type PushPrefs,
  type ReminderType,
} from "./push";

describe("VAPID key decoding", () => {
  it("decodes base64url with url-safe characters and no padding", () => {
    // "hello world" in base64url is aGVsbG8gd29ybGQ (no padding).
    const bytes = urlBase64ToUint8Array("aGVsbG8gd29ybGQ");
    expect(new TextDecoder().decode(bytes)).toBe("hello world");
  });

  it("maps - and _ back to + and /", () => {
    // 0xfb 0xff encodes to "-_8" in base64url ("+/8" in standard).
    const bytes = urlBase64ToUint8Array("-_8");
    expect([...bytes]).toEqual([0xfb, 0xff]);
  });

  it("produces the 65-byte uncompressed-point length for a real key", () => {
    // A P-256 public key is 65 bytes → 87 base64url chars.
    const key = "B".repeat(87);
    expect(urlBase64ToUint8Array(key).length).toBe(65);
  });
});

const TYPES: ReminderType[] = [
  {
    id: "daily_plan",
    label: "Today's plan",
    emoji: "🌱",
    purpose: "Morning hello.",
    default_hour: 9,
    default_on: true,
    weekday: null,
    sample: { title: "t", body: "b" },
    message_count: 7,
  },
  {
    id: "move",
    label: "Movement snack",
    emoji: "👟",
    purpose: "Midday nudge.",
    default_hour: 15,
    default_on: false,
    weekday: null,
    sample: { title: "t", body: "b" },
    message_count: 5,
  },
];

describe("reminder preferences", () => {
  it("seeds unset kinds from the server's defaults", () => {
    const prefs = prefsWithDefaults({ enabled: false, reminders: {} }, TYPES);
    expect(prefs.reminders.daily_plan).toEqual({ enabled: true, hour: 9 });
    expect(prefs.reminders.move).toEqual({ enabled: false, hour: 15 });
  });

  it("never overwrites a choice the person already made", () => {
    const chosen: PushPrefs = {
      enabled: true,
      reminders: { daily_plan: { enabled: false, hour: 6 } },
    };
    const prefs = prefsWithDefaults(chosen, TYPES);
    expect(prefs.reminders.daily_plan).toEqual({ enabled: false, hour: 6 });
  });

  it("sends only enabled kinds to the server, as kind → hour", () => {
    const prefs: PushPrefs = {
      enabled: true,
      reminders: {
        daily_plan: { enabled: true, hour: 8 },
        move: { enabled: false, hour: 15 },
        food: { enabled: true, hour: 12 },
      },
    };
    expect(activeReminders(prefs)).toEqual({ daily_plan: 8, food: 12 });
  });

  it("an all-off state sends an empty map rather than failing", () => {
    expect(activeReminders({ enabled: true, reminders: {} })).toEqual({});
  });
});
