import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { validateSubscriptionAccess } from "@/lib/subscriptionValidator";

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

  // Step 1.7: בדיקת מנוי פעיל עם PayPlus sync (Hybrid Strategy!)
  const validationResult = await validateSubscriptionAccess(user.id);
  const isSubscriptionActive = validationResult.hasAccess;
  
  console.log(`🔍 User ${user.id} subscription validation:`, {
    hasAccess: validationResult.hasAccess,
    reason: validationResult.reason,
  });

  // Step 2: Get active cameras for the user (מצלמות זמינות תמיד ל-live view!)
  const { data: cameras, error: cameraError } = await supabase
    .from("cameras")
    .select("id, name")
    .eq("user_email", session.user.email)
    .eq("is_stream_active", true);

  if (cameraError) {
    return NextResponse.json({ success: false, error: cameraError.message }, { status: 500 });
  }

  // אם אין מנוי פעיל אבל יש חיבור SIM - חוסמים גישה (אין אינטרנט ללא מנוי)
  if (!isSubscriptionActive && connectionType === 'sim') {
    console.warn(`⚠️ User ${user.id} has SIM plan without active subscription - blocking all access (no internet)`);
    
    return NextResponse.json({
      success: true,
      tunnel_name: user.tunnel_name,
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
    cameras,
    plan_duration_days: user.plan_duration_days ?? 14,
    subscription_status: 'active',
    connection_type: connectionType,
    subscription_active: true,
  });
}
