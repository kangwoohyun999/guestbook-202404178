import { neon } from "@neondatabase/serverless";
import type { Entry } from "./entry";

// 서버 전용. 접속 정보는 DATABASE_URL 하나뿐이다.
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

// SELECT/RETURNING은 이 컬럼만 고른다. password_hash는 응답으로 나가지 않는다.
export type EntryRow = {
  id: string | number;
  author_name: string;
  message: string;
  created_at: Date;
  updated_at: Date | null;
};

export function toEntry(row: EntryRow): Entry {
  return {
    id: Number(row.id),
    authorName: row.author_name,
    message: row.message,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
  };
}
