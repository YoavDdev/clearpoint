import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";
import { apiHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export const POST = apiHandler(async (req) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, cfTunnelToken } = body as {
    userId: string;
    cfTunnelToken?: string;
  };

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 1. Get user details
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 2. Get cameras for this user
  const { data: cameras, error: camError } = await supabase
    .from("cameras")
    .select("id, name, stream_path")
    .eq("user_id", userId);

  if (camError) {
    return NextResponse.json({ error: camError.message }, { status: 500 });
  }

  // 3. Find or create mini_pc for this user
  let { data: miniPc } = await supabase
    .from("mini_pcs")
    .select("id, device_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (!miniPc) {
    const { data: newPc, error: pcError } = await supabase
      .from("mini_pcs")
      .insert({
        device_name: `minipc-${user.full_name || user.email}`,
        hostname: "clearpoint",
        user_id: userId,
        is_active: true,
        installed_at: new Date().toISOString(),
      })
      .select("id, device_name")
      .single();

    if (pcError) {
      return NextResponse.json({ error: "Failed to create mini_pc: " + pcError.message }, { status: 500 });
    }
    miniPc = newPc;
  }

  // 4. Generate a fresh device token (revoke old ones)
  await supabase
    .from("mini_pc_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("mini_pc_id", miniPc.id)
    .is("revoked_at", null);

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(rawToken);

  const { error: tokenError } = await supabase.from("mini_pc_tokens").insert({
    token_hash: tokenHash,
    mini_pc_id: miniPc.id,
  });

  if (tokenError) {
    return NextResponse.json({ error: "Failed to create token: " + tokenError.message }, { status: 500 });
  }

  // 5. Build config JSON
  const config = {
    _comment: `Clearpoint Install Config — ${user.full_name || user.email}`,
    _generated_at: new Date().toISOString(),
    user_id: userId,
    device_token: rawToken,
    cf_tunnel_token: cfTunnelToken || "FILL_ME",
    b2: {
      account_id: process.env.B2_APPLICATION_KEY_ID || process.env.B2_ACCOUNT_ID || "FILL_ME",
      app_key: process.env.B2_APPLICATION_KEY || process.env.B2_APP_KEY || "FILL_ME",
      bucket_id: process.env.B2_BUCKET_ID || "FILL_ME",
    },
    cameras: (cameras || []).map((cam) => ({
      id: cam.id,
      name: cam.name,
      stream_path: cam.stream_path,
    })),
  };

  return NextResponse.json({ success: true, config });
});
