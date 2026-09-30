// API가 돌려주는 방명록 글. 글 비밀번호(해시 포함)는 절대 담지 않는다.
export type Entry = {
  id: number;
  authorName: string;
  message: string;
  createdAt: string;
  updatedAt: string | null;
};

const KST_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// 작성 시각·수정 시각을 한국 시간 YYYY-MM-DD HH:mm으로 표기한다.
export function formatEntryTime(iso: string): string {
  const parts = Object.fromEntries(
    KST_FORMAT.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

export type NewEntryInput = {
  authorName: string;
  message: string;
  password: string;
};

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

export const MESSAGE_MAX_LENGTH = 500;

// 이모지 등 서로게이트 쌍도 한 글자로 센다.
export function charCount(s: string): number {
  return Array.from(s).length;
}

function trimmedWithin(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const n = charCount(trimmed);
  return n >= min && n <= max ? trimmed : null;
}

export function validateNewEntry(input: {
  authorName: unknown;
  message: unknown;
  password: unknown;
}): Validation<NewEntryInput> {
  const authorName = trimmedWithin(input.authorName, 1, 20);
  if (authorName === null) {
    return { ok: false, error: "작성자 이름은 1~20자로 입력해주세요." };
  }
  const message = trimmedWithin(input.message, 1, MESSAGE_MAX_LENGTH);
  if (message === null) {
    return { ok: false, error: `메시지는 1~${MESSAGE_MAX_LENGTH}자로 입력해주세요.` };
  }
  const { password } = input;
  if (typeof password !== "string" || charCount(password) < 4 || charCount(password) > 20) {
    return { ok: false, error: "비밀번호는 4~20자로 입력해주세요." };
  }
  return { ok: true, value: { authorName, message, password } };
}
