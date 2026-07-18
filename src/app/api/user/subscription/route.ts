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
    .select("id, full_name, email, plan_id, custom_price, plan_duration_days, subscription_status")
    .eq("email", session.user.email)
    .single();

  if (userError || !user) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
    );
  }

  // Get plan details
  let plan = null;
  if (user.plan_id) {
    const { data: planData } = await supabase
      .from("plans")
      .select("id, name, name_he, monthly_price, setup_price, retention_days, connection_type, camera_limit")
      .eq("id", user.plan_id)
      .single();
    plan = planData;
  }

  // Get active recurring payment
  const { data: recurring } = await supabase
    .from("recurring_payments")
    .select("id, is_active, is_valid, amount, currency_code, recurring_type, start_date, last_charge_date, next_charge_date, notes, created_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Build subscription status
  const hasActiveSubscription = !!recurring && recurring.is_valid;

  return NextResponse.json({
    success: true,
    subscription: {
      status: !recurring ? 'none' : recurring.is_valid ? 'active' : 'suspended',
      is_active: recurring?.is_active || false,
      is_valid: recurring?.is_valid || false,
      amount: recurring?.amount || plan?.monthly_price || 0,
      currency: recurring?.currency_code || 'ILS',
      last_charge_date: recurring?.last_charge_date || null,
      next_charge_date: recurring?.next_charge_date || null,
      start_date: recurring?.start_date || null,
      notes: recurring?.notes || null,
    },
    plan: plan ? {
      id: plan.id,
      name: plan.name,
      name_he: plan.name_he,
      monthly_price: user.custom_price || plan.monthly_price,
      retention_days: user.plan_duration_days || plan.retention_days,
      connection_type: plan.connection_type,
      camera_limit: plan.camera_limit,
    } : null,
    has_active_subscription: hasActiveSubscription,
  });
});
