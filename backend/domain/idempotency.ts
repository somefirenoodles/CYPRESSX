import { createHash } from "node:crypto";
import type { Connection } from "oracledb";

export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,79}$/;

export class IdempotencyConflictError extends Error {
  readonly status = 409;

  constructor() {
    super("La clave de idempotencia ya fue utilizada con datos distintos.");
    this.name = "IdempotencyConflictError";
  }
}

export function isValidIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && IDEMPOTENCY_KEY_PATTERN.test(value);
}

export function assertIdempotencyKey(value: unknown): string {
  if (!isValidIdempotencyKey(value)) {
    throw new Error("La clave de idempotencia no es válida: usa de 8 a 80 caracteres alfanuméricos o . _ : -.");
  }
  return value;
}

/**
 * Serialización canónica y determinista para calcular el hash de una intención.
 * Las claves de objeto se ordenan; los valores undefined se omiten (como JSON).
 */
export function canonicalJson(value: unknown): string {
  return serialize(value, new Set<object>());
}

function serialize(value: unknown, seen: Set<object>): string {
  if (value === null) return "null";
  const type = typeof value;
  if (type === "string") return JSON.stringify(value);
  if (type === "boolean") return value ? "true" : "false";
  if (type === "number") {
    if (!Number.isFinite(value as number)) throw new Error("El payload idempotente contiene un número no finito.");
    return JSON.stringify(value);
  }
  if (type === "bigint") return JSON.stringify((value as bigint).toString());
  if (type === "undefined") return "null";
  if (type !== "object") throw new Error("El payload idempotente contiene un valor no serializable.");

  const composite = value as object;
  if (seen.has(composite)) throw new Error("El payload idempotente contiene una referencia circular.");
  seen.add(composite);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((item) => serialize(item, seen)).join(",")}]`;
    }
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${serialize(record[key], seen)}`);
    return `{${entries.join(",")}}`;
  } finally {
    seen.delete(composite);
  }
}

export function hashIdempotencyPayload(payload: unknown): string {
  return createHash("sha256").update(canonicalJson(payload), "utf8").digest("hex");
}

export function operationKey(scope: string, key: string): string {
  return createHash("sha256").update(`${scope}\0${key}`).digest("hex");
}

export type IdempotencyRequest = {
  userId: number;
  scope: string;
  key: string;
  payload: unknown;
};

const SCOPE_PATTERN = /^[a-z0-9._:-]{1,40}$/;

/**
 * Ejecuta `work` una sola vez por usuario + alcance + clave + payload.
 * Debe invocarse dentro de una transacción existente: no confirma ni revierte por sí mismo.
 * La restricción única serializa únicamente reintentos de la misma intención.
 */
export async function runIdempotent<T>(
  connection: Connection,
  request: IdempotencyRequest,
  work: () => Promise<T>
): Promise<T> {
  if (!Number.isInteger(request.userId) || request.userId <= 0) {
    throw new Error("El usuario de la operación idempotente no es válido.");
  }
  if (typeof request.scope !== "string" || !SCOPE_PATTERN.test(request.scope)) {
    throw new Error("El alcance de idempotencia no es válido.");
  }
  const key = assertIdempotencyKey(request.key);
  const requestHash = hashIdempotencyPayload(request.payload);

  const binds = { userId: request.userId, scope: request.scope, key };
  try {
    await connection.execute(`INSERT INTO cx_idempotency_records(user_id, scope_name, idempotency_key, request_hash, response_json)
      VALUES (:userId, :scope, :key, :requestHash, 'null')`, { ...binds, requestHash });
  } catch (error) {
    if ((error as { errorNum?: number }).errorNum !== 1) throw error;
    // Oracle waits for the competing insertion to commit or roll back before this unique conflict.
    const existing = await connection.execute<{ REQUEST_HASH: string; RESPONSE_JSON: string; STATUS: string }>(
      `SELECT request_hash, response_json, status FROM cx_idempotency_records
       WHERE user_id = :userId AND scope_name = :scope AND idempotency_key = :key`, binds);
    const record = existing.rows?.[0];
    if (!record || record.REQUEST_HASH !== requestHash || record.STATUS !== 'complete') throw new IdempotencyConflictError();
    return JSON.parse(record.RESPONSE_JSON) as T;
  }

  const value = await work();
  const responseJson = JSON.stringify(value);
  if (typeof responseJson !== "string" || Buffer.byteLength(responseJson, "utf8") > 4000) {
    throw new Error("La respuesta idempotente no se puede almacenar por su tamaño.");
  }

  await connection.execute(
    `UPDATE cx_idempotency_records SET response_json = :responseJson, status = 'complete'
      WHERE user_id = :userId AND scope_name = :scope AND idempotency_key = :key`,
    {
      userId: request.userId,
      scope: request.scope,
      key,
      responseJson,
    }
  );
  return value;
}
