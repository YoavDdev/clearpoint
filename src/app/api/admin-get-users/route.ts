import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Step 1: Fetch users + cameras as nested relation
  const { data: users, error } = await supabase
    .from("users")
    .select(`
      id,
      email,
      full_name,
      plan_id,
      phone,
      address,
      notes,
      custom_price,
      plan_duration_days,
      needs_support,
      initial_camera_count,
      cameras (id)
    `);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Step 2: Fetch support requests for unresolved tickets
  const { data: requests } = await supabase
    .from("support_requests")
    .select("user_id")
    .eq("is_handled", false);

  const activeSupportUsers = new Set(requests?.map((r) => r.user_id));

  // Step 3: Enrich each user with camera count + support flag
  const enriched = users.map((user) => ({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    plan_id: user.plan_id,
    phone: user.phone,
    address: user.address,
    notes: user.notes,
    custom_price: user.custom_price,
    plan_duration_days: user.plan_duration_days,
    needs_support: user.needs_support,
    has_pending_support: activeSupportUsers.has(user.id),
    initial_camera_count: user.initial_camera_count ?? 4,
    camera_count: user.cameras?.length || 0,
  }));

  return NextResponse.json({ success: true, users: enriched });
}
