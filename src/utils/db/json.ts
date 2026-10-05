import type { Json } from '../../types/database.ts';

// JSON columns are written by this module only, so reading them back as the
// domain type is safe; this is the single place that assertion happens.
export function fromJson<T>(value: Json | null | undefined, fallback: T): T {
  return value === null || value === undefined ? fallback : (value as unknown as T);
}
export function toJson(value: unknown): Json {
  return value as Json;
}

