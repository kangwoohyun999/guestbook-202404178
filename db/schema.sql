-- 방명록 글. 여러 번 실행해도 안전하다.
CREATE TABLE IF NOT EXISTS entries (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_name   text        NOT NULL,
  message       text        NOT NULL,
  password_hash text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz
);

CREATE INDEX IF NOT EXISTS entries_created_at_idx ON entries (created_at DESC);
