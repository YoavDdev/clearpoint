import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Body = {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  preferred_date?: string | null;
  selected_plan: string;
  admin_notes?: string | null;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;

  if (!body?.full_name || !body?.email || !body?.phone || !body?.address || !body?.selected_plan) {
    return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
  }

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
}
