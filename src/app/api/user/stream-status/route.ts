import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { path, isActive } = await req.json();
  const supabase = getSupabaseAdmin();

  if (!path || typeof isActive !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Update the row where `serial_number` matches the path
  const { error } = await supabase
    .from("cameras")
    .update({
      is_stream_active: isActive,
      last_seen_at: new Date().toISOString(),
    })
    .eq("serial_number", path); // Assuming `path` == `serial_number`

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
