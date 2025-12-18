import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { hasActiveSubscription } from "@/lib/subscription-check";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Step 1: Get user info (with tunnel_name, subscription_status)
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, tunnel_name, plan_duration_days, subscription_status")
    .eq("email", session.user.email)
    .single();

  if (userError) {
    return NextResponse.json({ success: false, error: userError.message }, { status: 500 });
  }

  // Step 1.5: Get user's plan connection_type from active subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plans(connection_type)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  const connectionType = (subscription as any)?.plans?.connection_type || null;

  // Step 1.7: בדיקת מנוי פעיל (בדיקה אמיתית!)
  const isSubscriptionActive = await hasActiveSubscription(user.id);
  
  console.log(`🔍 User ${user.id} subscription check:`, isSubscriptionActive);

  // אם אין מנוי פעיל - לא מחזירים מצלמות!
  if (!isSubscriptionActive) {
    console.warn(`⚠️ User ${user.id} has no active subscription - blocking camera access`);
    
    return NextResponse.json({
      success: true,
      tunnel_name: user.tunnel_name,
      cameras: [], // רשימה ריקה של מצלמות
      plan_duration_days: 0,
      subscription_status: 'inactive',
      connection_type: null,
      subscription_active: false,
      message: 'אין מנוי פעיל - גישה למצלמות חסומה'
    });
  }

  // Step 2: Get active cameras for the user (רק אם יש מנוי פעיל!)
  const { data: cameras, error: cameraError } = await supabase
    .from("cameras")
    .select("id, name")
    .eq("user_email", session.user.email)
    .eq("is_stream_active", true);

  if (cameraError) {
    return NextResponse.json({ success: false, error: cameraError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    tunnel_name: user.tunnel_name,
    cameras,
    plan_duration_days: user.plan_duration_days ?? 14,
    subscription_status: 'active',
    connection_type: connectionType,
    subscription_active: true,
  });
}
