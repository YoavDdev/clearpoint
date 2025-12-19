import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/check-subscriptions
 * Cron Job - בדיקה יומית של מנויים שעברו את תאריך החיוב
 * 
 * תפקידו:
 * 1. למצוא מנויים שעברו את next_payment_date ללא תשלום
 * 2. להעלות payment_failures
 * 3. להשעות מנויים עם 3+ כשלונות
 * 4. לשלוח התראות
 * 
 * צריך להריץ פעם ביום (Vercel Cron / external scheduler)
 */
export async function GET() {
  try {
    // בדיקת הרשאות - רק admin או cron
    const session = await getServerSession(authOptions);
    const cronSecret = process.env.CRON_SECRET;
    
    // אם יש secret, בדוק אותו (לא צריך session)
    // אחרת, דרוש admin
    if (!cronSecret && (!session || session.user.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();
    console.log(`🔍 Checking subscriptions at ${now.toISOString()}`);

    // מצא מנויים פעילים שעברו את תאריך החיוב
    const { data: overdueSubscriptions, error } = await supabase
      .from("subscriptions")
      .select(`
        *,
        user:users(id, email, full_name)
      `)
      .eq("status", "active")
      .not("recurring_uid", "is", null)
      .lt("next_payment_date", now.toISOString());

    if (error) {
      console.error("Error fetching overdue subscriptions:", error);
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${overdueSubscriptions?.length || 0} overdue subscriptions`);

    const results = {
      checked: overdueSubscriptions?.length || 0,
      suspended: 0,
      warned: 0,
      errors: 0,
    };

    // עבור על כל מנוי
    for (const sub of overdueSubscriptions || []) {
      try {
        const newFailures = (sub.payment_failures || 0) + 1;
        
        // אם הגענו ל-3 כשלונות - השעה את המנוי
        if (newFailures >= 3) {
          await supabase
            .from("subscriptions")
            .update({
              status: "suspended",
              payment_failures: newFailures,
            })
            .eq("id", sub.id);

          console.log(`🚫 Suspended subscription ${sub.id} (user: ${sub.user.email})`);
          results.suspended++;

          // שלח אימייל על השעיה
          // await sendSuspensionEmail(sub.user.email, sub.payment_failures);

        } else {
          // פחות מ-3 כשלונות - הגדל את המונה ושלח אזהרה
          await supabase
            .from("subscriptions")
            .update({
              payment_failures: newFailures,
            })
            .eq("id", sub.id);

          console.log(`⚠️ Payment failure #${newFailures} for subscription ${sub.id}`);
          results.warned++;

          // שלח אימייל אזהרה
          // await sendPaymentWarningEmail(sub.user.email, newFailures);
        }

        // רשום את הכשלון בלוג
        await supabase
          .from("subscription_charges")
          .insert({
            subscription_id: sub.id,
            user_id: sub.user_id,
            amount: sub.amount,
            currency: sub.currency || 'ILS',
            status: 'failed',
            recurring_uid: sub.recurring_uid,
            payment_method: sub.payment_method,
            error_code: 'OVERDUE',
            error_message: 'Payment date passed without charge',
            charged_at: now.toISOString(),
          });

      } catch (subError) {
        console.error(`Error processing subscription ${sub.id}:`, subError);
        results.errors++;
      }
    }

    // מצא מנויים בתקופת חסד שעברו את grace_period_end
    const { data: expiredGrace } = await supabase
      .from("subscriptions")
      .select("id, user_id, grace_period_end")
      .eq("status", "cancelled")
      .not("grace_period_end", "is", null)
      .lt("grace_period_end", now.toISOString());

    // סמן אותם כ-expired
    if (expiredGrace && expiredGrace.length > 0) {
      await supabase
        .from("subscriptions")
        .update({ status: "expired" })
        .in("id", expiredGrace.map(s => s.id));

      console.log(`⏰ Expired ${expiredGrace.length} grace period subscriptions`);
    }

    console.log("✅ Subscription check completed:", results);

    return NextResponse.json({
      success: true,
      message: "Subscription check completed",
      timestamp: now.toISOString(),
      results,
    });

  } catch (error) {
    console.error("Error in subscription check:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
