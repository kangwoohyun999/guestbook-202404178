import { describe, expect, it } from "vitest";
import { hashEntryPassword, verifyEntryPassword } from "./entry-password";

describe("글 비밀번호", () => {
  it("해시한 비밀번호와 같은 비밀번호는 통과한다", async () => {
    const stored = await hashEntryPassword("1234");
    expect(await verifyEntryPassword("1234", stored)).toBe(true);
  });

  it("다른 비밀번호는 거부한다", async () => {
    const stored = await hashEntryPassword("1234");
    expect(await verifyEntryPassword("12345", stored)).toBe(false);
    expect(await verifyEntryPassword(" 1234", stored)).toBe(false);
  });

  it("같은 비밀번호도 매번 다른 값으로 저장된다", async () => {
    const a = await hashEntryPassword("1234");
    const b = await hashEntryPassword("1234");
    expect(a).not.toBe(b);
    expect(a).not.toContain("1234");
  });

  it.each(["", "1234", "scrypt$zz$zz", "scrypt$00$00", "bcrypt$abc"])(
    "저장값이 올바르지 않으면(%j) 예외 없이 거부한다",
    async (stored) => {
      expect(await verifyEntryPassword("1234", stored)).toBe(false);
    },
  );
});
