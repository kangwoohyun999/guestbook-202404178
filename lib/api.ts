// API와 화면이 함께 쓰는 문구, 그리고 Route Handler 공통 도우미. 서버 전용 의존성이 없어 클라이언트에서도 import할 수 있다.
// 오류 응답은 모두 { error: "<화면에 그대로 보여줄 문구>" } 형태다.

export const BAD_REQUEST_MESSAGE = "요청 형식이 올바르지 않습니다.";
export const SERVER_ERROR_MESSAGE = "잠시 후 다시 시도해주세요.";

export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

// 요청 본문을 JSON 객체로 읽는다. JSON이 아니거나 객체가 아니면 null.
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
}
