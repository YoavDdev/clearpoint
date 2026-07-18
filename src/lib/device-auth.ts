import crypto from "crypto";
import { type SupabaseClient } from "@supabase/supabase-js";

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Validate a device token from x-clearpoint-device-token header.
 * Returns mini_pc_id if valid, null if invalid/revoked.
 * Also updates last_used_at on the token.
 */
export async function validateDeviceToken(
  supabase: SupabaseClient,
  token: string
): Promise<string | null> {
  const tokenHash = sha256Hex(token);

  const { data: tokenRow, error: tokenError } = await supabase
    .from("mini_pc_tokens")
    .select("token_hash, mini_pc_id, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenError) throw new Error(tokenError.message);
  if (!tokenRow || tokenRow.revoked_at) return null;

  await supabase
    .from("mini_pc_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);

  return tokenRow.mini_pc_id as string;
}
