import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiHandler } from "@/lib/api-handler";
import { subscribeRequestSchema, parseBody } from "@/lib/validations";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async (req) => {
  const raw = await req.json().catch(() => null);
  const parsed = parseBody(subscribeRequestSchema, raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }
  const body = parsed.data;

  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin.from("subscription_requests").insert({
    full_name: body.full_name,
    email: body.email,
    phone: body.phone,
    address: body.address,
    preferred_date: body.preferred_date ?? null,
    selected_plan: body.selected_plan,
    admin_notes: body.admin_notes ?? null,
    status: "new",
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
