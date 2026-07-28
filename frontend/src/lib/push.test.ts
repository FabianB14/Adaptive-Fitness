import { describe, expect, it } from "vitest";
import { urlBase64ToUint8Array } from "./push";

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
