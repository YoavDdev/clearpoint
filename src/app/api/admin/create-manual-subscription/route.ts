import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: Request) {
  try {
    const { userId, amount, billingCycle = 'monthly' } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // קבלת פרטי המשתמש
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, plan_id, custom_price, email, full_name")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // בדיקה אם כבר יש מנוי (כולל cancelled)
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", userId)
      .single();

    // אם יש מנוי פעיל - אין צורך ביצירה
    if (existingSubscription && existingSubscription.status === "active") {
      return NextResponse.json(
        { error: "User already has an active subscription" },
        { status: 400 }
      );
    }

    // חישוב תאריך חיוב הבא - חודש מהיום
    const nextBillingDate = new Date();
    if (billingCycle === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (billingCycle === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    const subscriptionAmount = amount || user.custom_price || 150;

    let subscription;

    // אם יש מנוי קיים (cancelled/past_due) - עדכן אותו
    if (existingSubscription) {
      console.log(`Updating existing subscription (${existingSubscription.status}) to active`);
      
      const { data: updatedSubscription, error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: 'active',
          billing_cycle: billingCycle,
          amount: subscriptionAmount,
          next_billing_date: nextBillingDate.toISOString().split('T')[0],
          started_at: new Date().toISOString(),
          metadata: {
            reactivated_manually: true,
            reactivated_by: 'admin',
            reactivated_at: new Date().toISOString(),
            previous_status: existingSubscription.status,
            note: 'Reactivated manually from admin panel - standing order exists in PayPlus',
          },
        })
        .eq("id", existingSubscription.id)
        .select()
        .single();

      if (updateError || !updatedSubscription) {
        console.error("Failed to update subscription:", updateError);
        return NextResponse.json(
          { error: "Failed to update subscription" },
          { status: 500 }
        );
      }

      subscription = updatedSubscription;
    } else {
      // אין מנוי כלל - צור חדש
      console.log("Creating new subscription");
      
      const { data: newSubscription, error: createError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan_id: user.plan_id || 'monthly-service',
          status: 'active',
          billing_cycle: billingCycle,
          amount: subscriptionAmount,
          currency: 'ILS',
          next_billing_date: nextBillingDate.toISOString().split('T')[0],
          started_at: new Date().toISOString(),
          payment_provider: 'payplus',
          provider_subscription_id: `manual-${Date.now()}`,
          metadata: {
            created_manually: true,
            created_by: 'admin',
            created_at: new Date().toISOString(),
            note: 'Created manually from admin panel - standing order exists in PayPlus',
          },
        })
        .select()
        .single();

      if (createError || !newSubscription) {
        console.error("Failed to create subscription:", createError);
        return NextResponse.json(
          { error: "Failed to create subscription" },
          { status: 500 }
        );
      }

      subscription = newSubscription;
    }

    // עדכון users עם subscription_id
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({
        subscription_id: subscription.id,
        subscription_active: true,
        subscription_status: 'active',
      })
      .eq("id", userId);

    if (userUpdateError) {
      console.error("Failed to update user:", userUpdateError);
    }

    return NextResponse.json({
      success: true,
      subscription: subscription,
      message: existingSubscription 
        ? "Subscription reactivated successfully" 
        : "Manual subscription created successfully",
    });

  } catch (error) {
    console.error("Error creating manual subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
