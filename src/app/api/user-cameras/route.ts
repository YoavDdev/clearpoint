import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

  // Step 1: Get user info
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, tunnel_name, plan_duration_days, full_name, role")
    .eq("email", session.user.email)
    .single();

  if (userError) {
    return NextResponse.json({ success: false, error: userError.message }, { status: 500 });
  }

  // Admin users always have full access
  const isAdmin = user.role?.toLowerCase() === 'admin';
  if (isAdmin) {
    console.log(`👑 Admin user ${user.id} - granting full access without subscription check`);
    
    const { data: cameras, error: cameraError } = await supabase
      .from("cameras")
      .select("id, name")
      .eq("user_email", session.user.email)
      .eq("is_stream_active", true);

    return NextResponse.json({
      success: true,
      tunnel_name: user.tunnel_name,
      user_name: user.full_name,
      cameras: cameras || [],
      plan_duration_days: user.plan_duration_days ?? 14,
      subscription_status: 'active',
      connection_type: 'admin',
      subscription_active: true,
      message: 'גישה מלאה - משתמש אדמין'
    });
  }

  // Step 2: Check for active subscription (real validation)
  const { data: activeSubscription } = await supabase
    .from("subscriptions")
    .select("id, status, plans(connection_type)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  // Step 2.5: Check for active recurring payment from PayPlus
  const { data: activeRecurringPayment } = await supabase
    .from("recurring_payments")
    .select("id, is_active, is_valid, plan_id, plans(connection_type)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .eq("is_valid", true)
    .single();

  // Get connection type from either subscription or recurring payment
  const connectionType = 
    (activeSubscription as any)?.plans?.connection_type || 
    (activeRecurringPayment as any)?.plans?.connection_type || 
    null;
  
  // User has active subscription if either exists
  const isSubscriptionActive = !!activeSubscription || !!activeRecurringPayment;
  
  console.log(`🔍 User ${user.id} subscription validation:`, {
    hasActiveSubscription: isSubscriptionActive,
    subscriptionId: activeSubscription?.id || 'none',
    recurringPaymentId: activeRecurringPayment?.id || 'none',
    connectionType,
  });

  // Step 2: Get active cameras for the user (מצלמות זמינות תמיד ל-live view!)
  const { data: cameras, error: cameraError } = await supabase
    .from("cameras")
    .select("id, name")
    .eq("user_email", session.user.email)
    .eq("is_stream_active", true);

  if (cameraError) {
    return NextResponse.json({ success: false, error: cameraError.message, user_name: null }, { status: 500 });
  }

  // אם אין מנוי פעיל אבל חיבור SIM - חוסמים גישה (אין אינטרנט ללא מנוי)
  if (!isSubscriptionActive && connectionType === 'sim') {
    console.warn(`⚠️ User ${user.id} has SIM plan without active subscription - blocking all access (no internet)`);
    
    return NextResponse.json({
      success: true,
      tunnel_name: user.tunnel_name,
      user_name: user.full_name,
      cameras: [], // רשימה ריקה - אין אינטרנט
      plan_duration_days: 0,
      subscription_status: 'inactive',
      connection_type: connectionType,
      subscription_active: false,
      message: 'אין מנוי פעיל - אין חיבור אינטרנט (SIM)'
    });
  }

  // אם אין מנוי פעיל אבל חיבור Wi-Fi - מאפשרים live view בלבד
  if (!isSubscriptionActive) {
    console.log(`✅ User ${user.id} has no subscription but can view live cameras (Wi-Fi connection)`);
    
    return NextResponse.json({
      success: true,
      tunnel_name: user.tunnel_name,
      user_name: user.full_name,
      cameras, // מצלמות זמינות ל-live view
      plan_duration_days: 0,
      subscription_status: 'inactive',
      connection_type: connectionType,
      subscription_active: false,
      message: 'ניתן לצפות בשידור חי בלבד - אין גישה להקלטות'
    });
  }

  // מנוי פעיל - גישה מלאה
  return NextResponse.json({
    success: true,
    tunnel_name: user.tunnel_name,
    user_name: user.full_name,
    cameras,
    plan_duration_days: user.plan_duration_days ?? 14,
    subscription_status: 'active',
    connection_type: connectionType,
    subscription_active: true,
  });
}
