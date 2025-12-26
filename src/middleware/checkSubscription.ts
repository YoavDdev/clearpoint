import { createClient } from "@supabase/supabase-js";

/**
 * בדיקה אם למשתמש יש subscription פעיל
 * @param userId - UUID של המשתמש
 * @returns true אם יש subscription פעיל, false אחרת
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("id, status, next_billing_date")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error || !subscription) {
    return false;
  }

  // בדוק שהתאריך הבא לא עבר (במקרה של כשלון תשלום)
  const nextBilling = new Date(subscription.next_billing_date);
  const today = new Date();
  
  // אם עבר יותר מ-7 ימים מהתאריך - חשוב כלא פעיל
  const daysSinceExpired = Math.floor((today.getTime() - nextBilling.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceExpired > 7) {
    return false;
  }

  return true;
}

/**
 * קבלת פרטי subscription של משתמש
 */
export async function getUserSubscription(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  return subscription;
}
