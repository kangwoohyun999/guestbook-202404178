// db/schema.sql을 DATABASE_URL의 DB에 적용한다. 실행: npm run db:init
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL이 설정되지 않았습니다. .env.local을 확인해주세요.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");

// HTTP 드라이버는 한 번에 한 문장만 실행하므로 세미콜론 기준으로 나눈다.
const statements = schema
  .split(";")
  .map((s) => s.replace(/--.*$/gm, "").trim())
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
}

console.log(`스키마 적용 완료 (${statements.length}개 문장)`);
