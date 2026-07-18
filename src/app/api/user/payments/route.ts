import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdmin();

  // Get user
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("email", session.user.email)
    .single();

  if (userError || !user) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
    );
  }

  // Get payments
  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("id, payment_type, amount, currency, status, description, paid_at, created_at, invoice_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (paymentsError) {
    return NextResponse.json(
      { success: false, error: "Failed to load payments" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    payments: payments || [],
  });
});
