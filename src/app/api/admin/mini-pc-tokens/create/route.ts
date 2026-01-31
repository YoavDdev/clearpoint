import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const miniPcId = body?.miniPcId as string | undefined;

  if (!miniPcId) {
    return NextResponse.json(
      { success: false, error: "Missing miniPcId" },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(token);

  const { error: revokeError } = await supabaseAdmin
    .from("mini_pc_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("mini_pc_id", miniPcId)
    .is("revoked_at", null);

  if (revokeError) {
    return NextResponse.json(
      { success: false, error: revokeError.message },
      { status: 500 }
    );
  }

  const { error: insertError } = await supabaseAdmin.from("mini_pc_tokens").insert({
    token_hash: tokenHash,
    mini_pc_id: miniPcId,
  });

  if (insertError) {
    return NextResponse.json(
      { success: false, error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, token });
}
