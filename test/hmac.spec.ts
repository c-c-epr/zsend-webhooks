import { describe, expect, it } from "vitest";
import { hmacSha256Hex } from "../src/unit/hmac";

describe("hmacSha256Hex", () => {
  it("returns the expected HMAC-SHA256 hex digest", async () => {
    await expect(hmacSha256Hex("Jefe", "what do ya want for nothing?")).resolves.toBe(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });
});
