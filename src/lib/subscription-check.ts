/**
 * Subscription Check Utilities
 * בדיקת סטטוס מנוי ואכיפת הגבלות
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * בדיקה אם למשתמש יש מנוי פעיל
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // בדיקה אם זה אדמין - אדמין תמיד פעיל!
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (user?.role === 'admin') {
      console.log(`👨‍💼 User ${userId} is admin - always active`);
      return true;
    }
    
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('status, next_billing_date')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !subscription) {
      console.log(`❌ No active subscription for user ${userId}`);
      return false;
    }

    // בדיקה שהמנוי לא פג (אם יש תאריך חיוב הבא)
    if (subscription.next_billing_date) {
      const nextBilling = new Date(subscription.next_billing_date);
      const now = new Date();
      
      // אם עבר תאריך החיוב הבא - המנוי פג (בהנחה שלא שילמו)
      if (nextBilling < now) {
        console.log(`⏰ Subscription expired for user ${userId} - next billing was ${subscription.next_billing_date}`);
        return false;
      }
    }

    console.log(`✅ User ${userId} has active subscription`);
    return true;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

/**
 * קבלת פרטי מנוי של משתמש
 */
export async function getSubscriptionDetails(userId: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plans(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !subscription) {
      return null;
    }

    return subscription;
  } catch (error) {
    console.error('Error getting subscription details:', error);
    return null;
  }
}

/**
 * בדיקה אם ללקוח יש הרשאה לשמור סרטים
 */
export async function canStoreRecordings(userId: string): Promise<{
  allowed: boolean;
  retentionDays: number;
  reason?: string;
}> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // בדיקה אם זה אדמין - אדמין תמיד יכול!
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  
  if (user?.role === 'admin') {
    console.log(`👨‍💼 Admin ${userId} - unlimited storage access`);
    return {
      allowed: true,
      retentionDays: 365 // אדמין - שנה מלאה (או ללא הגבלה)
    };
  }
  
  const subscription = await getSubscriptionDetails(userId);

  if (!subscription) {
    return {
      allowed: false,
      retentionDays: 0,
      reason: 'אין מנוי פעיל - שמירת סרטים מושבתת'
    };
  }

  // אם יש custom_price - נותנים ברירת מחדל
  const retentionDays = subscription.plan?.retention_days || 14;

  return {
    allowed: true,
    retentionDays: retentionDays
  };
}

/**
 * השבתת תכונות עקב חוסר מנוי
 */
export async function disableFeaturesDueToNoSubscription(userId: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`🚫 Disabling features for user ${userId} - no active subscription`);
    
    // ללא מנוי = אפס שמירה
    await supabase
      .from('users')
      .update({ 
        subscription_active: false,
        features_disabled_at: new Date().toISOString(),
        plan_duration_days: 0 // ⚠️ אפס ימים - ללא שמירה
      })
      .eq('id', userId);

    console.log(`📊 Set plan_duration_days = 0 for user ${userId} (no storage)`);

    return true;
  } catch (error) {
    console.error('Error disabling features:', error);
    return false;
  }
}

/**
 * הפעלת תכונות חזרה אחרי תשלום
 */
export async function enableFeaturesAfterPayment(userId: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`✅ Enabling features for user ${userId} - subscription paid`);
    
    // החזרת ימי שמירה (14 ימים עם מנוי פעיל)
    await supabase
      .from('users')
      .update({ 
        subscription_active: true,
        features_disabled_at: null,
        plan_duration_days: 14 // ✅ החזרת 14 ימי שמירה
      })
      .eq('id', userId);

    console.log(`📊 Set plan_duration_days = 14 for user ${userId}`);

    return true;
  } catch (error) {
    console.error('Error enabling features:', error);
    return false;
  }
}
