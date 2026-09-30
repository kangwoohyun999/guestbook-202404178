import { describe, expect, it } from "vitest";
import {
  formatEntryTime,
  parseEntryId,
  validateEntryDeletion,
  validateMessageEdit,
  validateNewEntry,
} from "./entry";

describe("방명록 글 삭제 요청 검증", () => {
  it("글 비밀번호를 그대로 넘긴다", () => {
    expect(validateEntryDeletion({ password: " 1234" })).toEqual({
      ok: true,
      value: { password: " 1234" },
    });
  });

  it.each([
    ["비어 있으면", ""],
    ["문자열이 아니면", 1234],
  ])("글 비밀번호가 %s 거부한다", (_, password) => {
    expect(validateEntryDeletion({ password })).toEqual({
      ok: false,
      error: "글 비밀번호를 입력해주세요.",
    });
  });
});

describe("메시지 수정 검증", () => {
  it("새 메시지는 앞뒤 공백을 제거하고, 글 비밀번호는 그대로 둔다", () => {
    expect(validateMessageEdit({ message: " 고친 글\n ", password: " 12 " })).toEqual({
      ok: true,
      value: { message: "고친 글", password: " 12 " },
    });
  });

  it.each([
    ["1자", "a"],
    ["500자", "가".repeat(500)],
  ])("새 메시지는 %s를 허용한다", (_, message) => {
    expect(validateMessageEdit({ message, password: "1234" }).ok).toBe(true);
  });

  it.each([
    ["비어 있으면", ""],
    ["공백과 줄바꿈뿐이면", " \n "],
    ["501자이면", "가".repeat(501)],
  ])("새 메시지가 %s 작성 때와 같이 거부한다", (_, message) => {
    expect(validateMessageEdit({ message, password: "1234" })).toEqual({
      ok: false,
      error: "메시지는 1~500자로 입력해주세요.",
    });
  });

  it.each([
    ["비어 있으면", ""],
    ["없으면", undefined],
  ])("글 비밀번호가 %s 거부한다", (_, password) => {
    expect(validateMessageEdit({ message: "고친 글", password })).toEqual({
      ok: false,
      error: "글 비밀번호를 입력해주세요.",
    });
  });
});

describe("방명록 글 id 해석", () => {
  it.each([
    ["1", 1],
    ["42", 42],
  ])("양의 정수 %s는 id로 읽는다", (raw, id) => {
    expect(parseEntryId(raw)).toBe(id);
  });

  it.each(["0", "-1", "1.5", "abc", "", " 1", "1e3", "01", "99999999999999999999"])(
    "%j는 id가 아니다",
    (raw) => {
      expect(parseEntryId(raw)).toBeNull();
    },
  );
});

describe("방명록 글 시각 표기", () => {
  it("한국 시간 기준 YYYY-MM-DD HH:mm으로 표기한다", () => {
    expect(formatEntryTime("2026-09-30T06:30:22.234Z")).toBe("2026-09-30 15:30");
  });

  it("KST로 자정을 넘기면 다음 날 00시로 표기한다", () => {
    expect(formatEntryTime("2026-12-31T15:05:00Z")).toBe("2027-01-01 00:05");
  });
});

describe("새 방명록 글 검증", () => {
  it("올바른 입력은 앞뒤 공백을 제거한 값으로 통과한다", () => {
    expect(
      validateNewEntry({
        authorName: "  강우현 ",
        message: "\n안녕하세요!  ",
        password: "1234",
      }),
    ).toEqual({
      ok: true,
      value: { authorName: "강우현", message: "안녕하세요!", password: "1234" },
    });
  });

  const valid = { authorName: "강우현", message: "안녕하세요", password: "1234" };

  it.each([
    ["1자", "가"],
    ["20자", "가".repeat(20)],
  ])("작성자 이름은 %s를 허용한다", (_, authorName) => {
    expect(validateNewEntry({ ...valid, authorName }).ok).toBe(true);
  });

  it.each([
    ["비어 있으면", ""],
    ["공백뿐이면", "   "],
    ["21자이면", "가".repeat(21)],
    ["문자열이 아니면", 42],
  ])("작성자 이름이 %s 거부한다", (_, authorName) => {
    expect(validateNewEntry({ ...valid, authorName })).toEqual({
      ok: false,
      error: "작성자 이름은 1~20자로 입력해주세요.",
    });
  });

  it("메시지는 500자까지, 줄바꿈을 포함해 허용한다", () => {
    const message = "첫 줄\n둘째 줄".padEnd(500, "가");
    expect(validateNewEntry({ ...valid, message })).toMatchObject({
      ok: true,
      value: { message },
    });
  });

  it("메시지는 1자도 허용한다", () => {
    expect(validateNewEntry({ ...valid, message: "a" }).ok).toBe(true);
  });

  it.each([
    ["비어 있으면", ""],
    ["공백과 줄바꿈뿐이면", " \n\t "],
    ["501자이면", "가".repeat(501)],
    ["없으면", undefined],
  ])("메시지가 %s 거부한다", (_, message) => {
    expect(validateNewEntry({ ...valid, message })).toEqual({
      ok: false,
      error: "메시지는 1~500자로 입력해주세요.",
    });
  });

  it.each([
    ["4자", "abcd"],
    ["20자", "a".repeat(20)],
  ])("글 비밀번호는 %s를 허용한다", (_, password) => {
    expect(validateNewEntry({ ...valid, password }).ok).toBe(true);
  });

  it("글 비밀번호의 공백은 자르지 않고 그대로 둔다", () => {
    expect(validateNewEntry({ ...valid, password: " ab " })).toMatchObject({
      ok: true,
      value: { password: " ab " },
    });
  });

  it.each([
    ["3자이면", "abc"],
    ["21자이면", "a".repeat(21)],
    ["숫자이면", 1234],
  ])("글 비밀번호가 %s 거부한다", (_, password) => {
    expect(validateNewEntry({ ...valid, password })).toEqual({
      ok: false,
      error: "비밀번호는 4~20자로 입력해주세요.",
    });
  });
});
