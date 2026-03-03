import { sql } from '@contentsmith/database';

/**
 * Embeds a value directly into a SQL literal with an explicit `::jsonb` cast.
 *
 * Why sql.raw() and not a parameterised sql`${value}::jsonb`:
 *   drizzle-orm 0.29 calls JSON.stringify() in mapToDriverValue for jsonb
 *   columns. When the resulting string is then sent via a bound parameter
 *   ($1), postgres-js transmits it as a plain text OID. PostgreSQL may treat
 *   the text as a JSON *string* literal rather than a JSON *object*, producing
 *   the double-escaped storage artefact ("{\"key\":\"val\"}").
 *
 *   Using sql.raw() inlines the JSON directly into the query text as a
 *   PostgreSQL string literal with a ::jsonb cast, e.g.:
 *     condition_group = '{"op":"AND","items":[]}'::jsonb
 *   PostgreSQL's jsonb input function then parses the literal correctly.
 *
 * Single quotes inside the serialised JSON are escaped as '' (SQL standard).
 * JSON.stringify output never contains unescaped backslashes in string values
 * (it uses \\ for backslashes), so no additional backslash handling is needed
 * when standard_conforming_strings = on (PostgreSQL default since 9.1).
 */
export function toJsonb(value: unknown): ReturnType<typeof sql.raw> | null {
  if (value === null || value === undefined) return null;

  // If the value arrived as a string (e.g. already-serialised from a previous
  // bad save), parse it back to an object first so we store an object, not a
  // string literal.
  let obj: unknown;
  if (typeof value === 'string') {
    try { obj = JSON.parse(value); } catch { obj = value; }
  } else {
    obj = value;
  }

  // Escape single quotes for inclusion in a PostgreSQL string literal.
  const jsonStr = JSON.stringify(obj).replace(/'/g, "''");
  return sql.raw(`'${jsonStr}'::jsonb`);
}
