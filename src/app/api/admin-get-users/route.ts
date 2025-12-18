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
      subscription_active,
      subscription_status,
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

  // Step 3: Fetch subscriptions for all users
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("user_id, status, amount, next_billing_date, last_billing_date, billing_cycle");

  const subscriptionMap = new Map(
    subscriptions?.map((sub) => [sub.user_id, sub]) || []
  );

  // Step 4: Fetch latest payment for each user
  const { data: latestPayments } = await supabase
    .from("payments")
    .select("user_id, amount, status, paid_at, payment_type")
    .order("created_at", { ascending: false });

  // Group payments by user and get the latest one
  const paymentMap = new Map();
  latestPayments?.forEach((payment) => {
    if (!paymentMap.has(payment.user_id)) {
      paymentMap.set(payment.user_id, payment);
    }
  });

  // Step 5: Enrich each user with camera count + support flag + subscription + payment info
  const enriched = users.map((user) => {
    const subscription = subscriptionMap.get(user.id);
    const latestPayment = paymentMap.get(user.id);
    
    return {
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
      subscription_active: user.subscription_active,
      subscription_status: user.subscription_status,
      initial_camera_count: user.initial_camera_count ?? 4,
      camera_count: user.cameras?.length || 0,
      // Subscription details
      subscription: subscription ? {
        status: subscription.status,
        amount: subscription.amount,
        next_billing_date: subscription.next_billing_date,
        last_billing_date: subscription.last_billing_date,
        billing_cycle: subscription.billing_cycle,
      } : null,
      // Latest payment details
      latest_payment: latestPayment ? {
        amount: latestPayment.amount,
        status: latestPayment.status,
        paid_at: latestPayment.paid_at,
        payment_type: latestPayment.payment_type,
      } : null,
    };
  });

  return NextResponse.json({ success: true, users: enriched });
}
