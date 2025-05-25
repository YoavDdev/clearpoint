import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, full_name, plan_type, phone, address, notes, custom_price, plan_duration_days, needs_support");

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Fetch support requests grouped by user_id where is_handled = false
  const { data: requests } = await supabase
    .from("support_requests")
    .select("user_id")
    .eq("is_handled", false);

  const activeSupportUsers = new Set(requests?.map((r) => r.user_id));

  const enriched = users.map((user) => ({
    ...user,
    has_pending_support: activeSupportUsers.has(user.id)
  }));

  return NextResponse.json({ success: true, users: enriched });
}
