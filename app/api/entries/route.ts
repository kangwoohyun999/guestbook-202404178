import { getSql, toEntry, type EntryRow } from "@/lib/db";
import { validateNewEntry } from "@/lib/entry";
import { hashEntryPassword } from "@/lib/entry-password";

const SERVER_ERROR = "잠시 후 다시 시도해주세요.";

export async function GET() {
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT id, author_name, message, created_at, updated_at
      FROM entries
      ORDER BY created_at DESC, id DESC
    `) as EntryRow[];
    return Response.json({ entries: rows.map(toEntry) });
  } catch (err) {
    console.error("GET /api/entries", err);
    return Response.json({ error: SERVER_ERROR }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { authorName, message, password } = body as Record<string, unknown>;
  const result = validateNewEntry({ authorName, message, password });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  try {
    const sql = getSql();
    const passwordHash = await hashEntryPassword(result.value.password);
    const [row] = (await sql`
      INSERT INTO entries (author_name, message, password_hash)
      VALUES (${result.value.authorName}, ${result.value.message}, ${passwordHash})
      RETURNING id, author_name, message, created_at, updated_at
    `) as EntryRow[];
    return Response.json({ entry: toEntry(row) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/entries", err);
    return Response.json({ error: SERVER_ERROR }, { status: 500 });
  }
}
