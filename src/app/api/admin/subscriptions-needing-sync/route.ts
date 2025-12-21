import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/subscriptions-needing-sync
 * מחזיר רשימה של מנויים שצריכים סנכרון עם פרטים מלאים
 */
export async function GET() {
  try {
    // בדיקת הרשאות אדמין
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Admin only" },
        { status: 403 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // קריאה לפונקציה שמוצאת מנויים
    const { data: subscriptionsData, error: functionError } = await supabase.rpc(
      "find_subscriptions_needing_sync"
    );

    if (functionError) {
      console.error("Error calling find_subscriptions_needing_sync:", functionError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch subscriptions" },
        { status: 500 }
      );
    }

    if (!subscriptionsData || subscriptionsData.length === 0) {
      return NextResponse.json({
        success: true,
        subscriptions: [],
        count: 0,
        message: "No subscriptions need sync",
      });
    }

    // הוסף פרטי משתמש לכל מנוי
    const userIds = subscriptionsData.map((sub: any) => sub.user_id);
    const { data: users } = await supabase
      .from("users")
      .select("id, email, full_name")
      .in("id", userIds);

    // שלוף גם את הסטטוס והסכום של כל מנוי
    const subscriptionIds = subscriptionsData.map((sub: any) => sub.subscription_id);
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("*")
      .in("id", subscriptionIds);

    // מיזוג הנתונים
    const enrichedData = subscriptionsData.map((sub: any) => {
      const user = users?.find((u) => u.id === sub.user_id);
      const subscription = subscriptions?.find((s) => s.id === sub.subscription_id);

      return {
        ...sub,
        email: user?.email,
        full_name: user?.full_name,
        status: subscription?.status,
        amount: subscription?.amount,
        last_sync_with_payplus: subscription?.last_sync_with_payplus,
        last_payment_date: subscription?.last_payment_date,
        next_payment_date: subscription?.next_payment_date,
        payment_failures: subscription?.payment_failures,
        recurring_uid: subscription?.recurring_uid,
        payplus_customer_uid: subscription?.payplus_customer_uid,
      };
    });

    return NextResponse.json({
      success: true,
      subscriptions: enrichedData,
      count: enrichedData.length,
    });
  } catch (error) {
    console.error("Error fetching subscriptions needing sync:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
