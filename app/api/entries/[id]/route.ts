import type { NextRequest } from "next/server";
import { BAD_REQUEST_MESSAGE, jsonError, readJsonObject, SERVER_ERROR_MESSAGE } from "@/lib/api";
import { getSql, toEntry, type EntryRow } from "@/lib/db";
import { parseEntryId, validateEntryDeletion, validateMessageEdit } from "@/lib/entry";
import { verifyEntryPassword } from "@/lib/entry-password";

const GONE_MESSAGE = "이미 삭제된 글입니다.";
const WRONG_PASSWORD_MESSAGE = "비밀번호가 일치하지 않습니다.";

type Ctx = RouteContext<"/api/entries/[id]">;

// 방명록 글이 있고 글 비밀번호가 맞는지 확인한다. 통과하면 null, 아니면 보낼 오류 응답.
async function checkEntryPassword(id: number, password: string): Promise<Response | null> {
  const sql = getSql();
  const [row] = (await sql`SELECT password_hash FROM entries WHERE id = ${id}`) as {
    password_hash: string;
  }[];
  if (!row) return jsonError(404, GONE_MESSAGE);
  if (!(await verifyEntryPassword(password, row.password_hash))) {
    return jsonError(403, WRONG_PASSWORD_MESSAGE);
  }
  return null;
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const id = parseEntryId((await ctx.params).id);
  if (id === null) return jsonError(404, GONE_MESSAGE);

  const body = await readJsonObject(request);
  if (!body) return jsonError(400, BAD_REQUEST_MESSAGE);
  const result = validateMessageEdit({ message: body.message, password: body.password });
  if (!result.ok) return jsonError(400, result.error);

  try {
    const denied = await checkEntryPassword(id, result.value.password);
    if (denied) return denied;

    // 확인과 수정 사이에 삭제됐다면 RETURNING이 비어 404가 된다.
    const sql = getSql();
    const [row] = (await sql`
      UPDATE entries
      SET message = ${result.value.message}, updated_at = now()
      WHERE id = ${id}
      RETURNING id, author_name, message, created_at, updated_at
    `) as EntryRow[];
    if (!row) return jsonError(404, GONE_MESSAGE);
    return Response.json({ entry: toEntry(row) });
  } catch (err) {
    console.error(`PATCH /api/entries/${id}`, err);
    return jsonError(500, SERVER_ERROR_MESSAGE);
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const id = parseEntryId((await ctx.params).id);
  if (id === null) return jsonError(404, GONE_MESSAGE);

  const body = await readJsonObject(request);
  if (!body) return jsonError(400, BAD_REQUEST_MESSAGE);
  const result = validateEntryDeletion({ password: body.password });
  if (!result.ok) return jsonError(400, result.error);

  try {
    const denied = await checkEntryPassword(id, result.value.password);
    if (denied) return denied;

    const sql = getSql();
    const deleted = await sql`DELETE FROM entries WHERE id = ${id} RETURNING id`;
    if (deleted.length === 0) return jsonError(404, GONE_MESSAGE);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error(`DELETE /api/entries/${id}`, err);
    return jsonError(500, SERVER_ERROR_MESSAGE);
  }
}
