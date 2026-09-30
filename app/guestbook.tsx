"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { SERVER_ERROR_MESSAGE } from "@/lib/api";
import {
  charCount,
  formatEntryTime,
  MESSAGE_MAX_LENGTH,
  validateEntryDeletion,
  validateMessageEdit,
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
  return typeof body?.error === "string" ? body.error : SERVER_ERROR_MESSAGE;
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

  // 이미 삭제된 글을 고치거나 지우려 했을 때의 안내.
  const [notice, setNotice] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setList(await fetchEntries());
  }, []);

  const refresh = useCallback(async () => {
    setNotice(null);
    await loadEntries();
  }, [loadEntries]);

  const handleGone = useCallback(
    (message: string) => {
      setNotice(message);
      loadEntries();
    },
    [loadEntries],
  );

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
      <EntryForm onCreated={refresh} />
      <section aria-label="방명록 글 목록" className="flex flex-col gap-3">
        {notice && (
          <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {notice}
          </p>
        )}
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
                <EntryCard entry={entry} onChanged={refresh} onGone={handleGone} />
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
      setError(SERVER_ERROR_MESSAGE);
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

type CardMode = "view" | "edit" | "delete";

const smallButtonClass =
  "rounded-md border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900";

function EntryCard({
  entry,
  onChanged,
  onGone,
}: {
  entry: Entry;
  onChanged: () => Promise<void>;
  onGone: (notice: string) => void;
}) {
  const [mode, setMode] = useState<CardMode>("view");
  const [draft, setDraft] = useState(entry.message);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: CardMode) {
    setMode(next);
    setDraft(entry.message);
    setPassword("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const check =
      mode === "edit"
        ? validateMessageEdit({ message: draft, password })
        : validateEntryDeletion({ password });
    if (!check.ok) {
      setError(check.error);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: mode === "edit" ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(check.value),
      });
      if (res.status === 404) {
        onGone(await readErrorMessage(res));
        return;
      }
      // 비밀번호가 틀려도(403) 입력하던 메시지는 그대로 둔다.
      if (!res.ok) {
        setError(await readErrorMessage(res));
        return;
      }
      setMode("view");
      await onChanged();
    } catch {
      setError(SERVER_ERROR_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

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
        {mode === "view" && (
          <span className="ml-auto flex gap-1.5">
            <button type="button" className={smallButtonClass} onClick={() => switchMode("edit")}>
              수정
            </button>
            <button type="button" className={smallButtonClass} onClick={() => switchMode("delete")}>
              삭제
            </button>
          </span>
        )}
      </header>

      {mode === "edit" ? null : (
        <p className="mt-2 whitespace-pre-wrap break-words">{entry.message}</p>
      )}

      {mode !== "view" && (
        <form onSubmit={handleSubmit} className="mt-3">
          <fieldset disabled={busy} className="flex min-w-0 flex-col gap-2 disabled:opacity-70">
            {mode === "edit" && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="flex justify-between">
                  메시지
                  <span className="text-zinc-500">
                    {charCount(draft.trim())}/{MESSAGE_MAX_LENGTH}
                  </span>
                </span>
                <textarea
                  className={`${inputClass} min-h-20 resize-y`}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              </label>
            )}
            <label className="flex flex-col gap-1 text-sm">
              {mode === "edit" ? "글 비밀번호" : "삭제하려면 글 비밀번호를 입력하세요"}
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus={mode === "delete"}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className={smallButtonClass} onClick={() => switchMode("view")}>
                취소
              </button>
              <button
                type="submit"
                className={
                  mode === "edit"
                    ? "rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white"
                }
              >
                {busy ? "처리 중…" : mode === "edit" ? "저장" : "삭제"}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </article>
  );
}
