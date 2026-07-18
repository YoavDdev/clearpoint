import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// ─── GET /api/admin/support — List all support requests ─────────────────────

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("support_requests")
    .select("id, email, message, created_at, is_handled, user_id, category, file_url")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, requests: data });
}

// ─── POST /api/admin/support — Mark request as handled ──────────────────────

export async function POST(req: Request) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("support_requests")
    .update({ is_handled: true })
    .eq("id", id)
    .select("id, email, message, created_at, is_handled, user_id, category, file_url");

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: data?.[0] });
}

// ─── PUT /api/admin/support — Mark user needs_support flag ──────────────────

export async function PUT(req: Request) {
  const { userId, needs_support } = await req.json();

  if (!userId) {
    return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("users")
    .update({ needs_support })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
