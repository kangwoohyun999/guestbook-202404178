import { BAD_REQUEST_MESSAGE, jsonError, readJsonObject, SERVER_ERROR_MESSAGE } from "@/lib/api";
import { getSql, toEntry, type EntryRow } from "@/lib/db";
import { validateNewEntry } from "@/lib/entry";
import { hashEntryPassword } from "@/lib/entry-password";

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
    return jsonError(500, SERVER_ERROR_MESSAGE);
  }
}

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return jsonError(400, BAD_REQUEST_MESSAGE);

  const { authorName, message, password } = body;
  const result = validateNewEntry({ authorName, message, password });
  if (!result.ok) return jsonError(400, result.error);

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
    return jsonError(500, SERVER_ERROR_MESSAGE);
  }
}
