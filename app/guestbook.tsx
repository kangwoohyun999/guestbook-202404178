"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  charCount,
  formatEntryTime,
  MESSAGE_MAX_LENGTH,
  validateNewEntry,
  type Entry,
} from "@/lib/entry";

type ListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; entries: Entry[] };

// 실패 응답의 { error } 문구를 꺼낸다. 본문이 없거나 JSON이 아니면 기본 문구를 쓴다.
async function readErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : "잠시 후 다시 시도해주세요.";
}

async function fetchEntries(): Promise<ListState> {
  try {
    const res = await fetch("/api/entries", { cache: "no-store" });
    if (!res.ok) return { status: "error" };
    const { entries } = (await res.json()) as { entries: Entry[] };
    return { status: "ready", entries };
  } catch {
    return { status: "error" };
  }
}

export default function Guestbook() {
  const [list, setList] = useState<ListState>({ status: "loading" });

  const loadEntries = useCallback(async () => {
    setList(await fetchEntries());
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchEntries().then((next) => {
      if (!ignore) setList(next);
    });
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <EntryForm onCreated={loadEntries} />
      <section aria-label="방명록 글 목록">
        {list.status === "loading" && <p className="text-zinc-500">불러오는 중…</p>}
        {list.status === "error" && (
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <p>목록을 불러오지 못했습니다.</p>
            <button
              type="button"
              className="rounded-md border border-current px-3 py-1 text-sm"
              onClick={() => {
                setList({ status: "loading" });
                loadEntries();
              }}
            >
              다시 시도
            </button>
          </div>
        )}
        {list.status === "ready" && list.entries.length === 0 && (
          <p className="text-zinc-500">첫 방명록을 남겨주세요.</p>
        )}
        {list.status === "ready" && list.entries.length > 0 && (
          <ul className="flex flex-col gap-3">
            {list.entries.map((entry) => (
              <li key={entry.id}>
                <EntryCard entry={entry} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100";

function EntryForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // 서버와 같은 규칙으로 먼저 검사한다. 글자 수는 이모지도 한 글자로 센다.
    const result = validateNewEntry({ authorName, message, password });
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.value),
      });
      if (!res.ok) {
        setError(await readErrorMessage(res));
        return;
      }
      // 이름은 다음 글에도 쓰도록 남겨 둔다.
      setMessage("");
      setPassword("");
      await onCreated();
    } catch {
      setError("잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      {/* 제출 중에는 입력을 잠가, 성공 후 비우기가 새로 입력한 내용을 지우지 않게 한다. */}
      <fieldset disabled={submitting} className="flex min-w-0 flex-col gap-3 disabled:opacity-70">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            작성자 이름
            <input
              className={inputClass}
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              autoComplete="nickname"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            글 비밀번호
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="flex justify-between">
            메시지
            <span className="text-zinc-500">{charCount(message.trim())}/{MESSAGE_MAX_LENGTH}</span>
          </span>
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="self-end rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {submitting ? "남기는 중…" : "남기기"}
        </button>
      </fieldset>
    </form>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  return (
    <article className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <header className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-semibold">{entry.authorName}</span>
        <time dateTime={entry.createdAt} className="text-zinc-500">
          {formatEntryTime(entry.createdAt)}
        </time>
        {entry.updatedAt && (
          <span className="text-zinc-500">(수정됨 · {formatEntryTime(entry.updatedAt)})</span>
        )}
      </header>
      <p className="mt-2 whitespace-pre-wrap break-words">{entry.message}</p>
    </article>
  );
}
