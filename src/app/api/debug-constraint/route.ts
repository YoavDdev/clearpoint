import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Test inserting a user with 3 days to see the exact error
    const testUserId = crypto.randomUUID();
    
    const { error: testError } = await supabase.from("users").insert({
      id: testUserId,
      email: "test@example.com",
      full_name: "Test User",
      plan_id: "sim_3",
      plan_duration_days: 3,
      phone: "123456789",
      address: "Test Address",
      custom_price: 89,
      subscription_status: "active"
    });

    if (testError) {
      // Clean up the test user if it was created
      await supabase.from("users").delete().eq("id", testUserId);
      
      return NextResponse.json({
        success: false,
        error: testError.message,
        error_code: testError.code,
        error_details: testError.details,
        hint: testError.hint,
        constraint_issue: "The constraint is preventing 3-day retention",
        current_users_retention: await getCurrentRetentionValues(supabase)
      });
    }

    // Clean up successful test
    await supabase.from("users").delete().eq("id", testUserId);
    
    return NextResponse.json({
      success: true,
      message: "3-day retention works fine",
      current_users_retention: await getCurrentRetentionValues(supabase)
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      type: "unexpected_error"
    });
  }
}

async function getCurrentRetentionValues(supabase: any) {
  const { data: users } = await supabase
    .from('users')
    .select('plan_duration_days')
    .not('plan_duration_days', 'is', null);
  
  const values = [...new Set(users?.map((u: any) => u.plan_duration_days) || [])];
  return values.sort((a: number, b: number) => a - b);
}
