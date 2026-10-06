// Shared helpers for server actions. NOT a 'use server' file on purpose: these are plain
// sync helpers that the action files import.

export type ActionResult = { success?: true; error?: string; [key: string]: unknown };

type PgError = { code?: string; message: string };

/**
 * Turns a raw Postgres/PostgREST error into something a user can act on.
 *  23505 unique_violation   -> `duplicate`
 *  23503 foreign_key_violation -> `inUse` (the record is referenced by history)
 *  42501 insufficient_privilege / RLS -> the permission message
 */
export function dbError(error: PgError, msgs: { duplicate?: string; inUse?: string } = {}): ActionResult {
  if (error.code === '23505') return { error: msgs.duplicate ?? 'A record with those details already exists.' };
  if (error.code === '23503') return { error: msgs.inUse ?? 'This record is still referenced by other data.' };
  if (error.code === '42501') return { error: "You don't have permission to do that, or the record is locked." };
  return { error: error.message };
}

/**
 * An RLS-denied UPDATE/DELETE does not raise an error: it matches zero rows. Every
 * update/delete action calls .select('id') and passes the rows through here, so a silent
 * denial becomes a visible message instead of a fake "success".
 */
export function noRowsAffected(reason?: string): ActionResult {
  return {
    error:
      reason ??
      "Nothing was changed. The record may be locked, already gone, or your role isn't allowed to modify it.",
  };
}
