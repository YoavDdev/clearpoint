import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔵 Starting PayPlus sync...');

    // Call PayPlus API directly to get raw data
    const baseUrl = process.env.PAYPLUS_USE_MOCK === 'true' 
      ? 'https://restapidev.payplus.co.il'
      : 'https://restapi.payplus.co.il';
    
    const apiUrl = `${baseUrl}/api/v1.0/RecurringPayments/View?terminal_uid=${process.env.PAYPLUS_TERMINAL_UID}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'api-key': process.env.PAYPLUS_API_KEY!,
        'secret-key': process.env.PAYPLUS_SECRET_KEY!,
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `PayPlus API error: ${response.status}`,
        synced: 0,
      });
    }

    const rawData = await response.json();
    
    if (!rawData || !rawData.data || !Array.isArray(rawData.data)) {
      return NextResponse.json({
        success: true,
        message: 'לא נמצאו מנויים ב-PayPlus',
        synced: 0,
        skipped: 0,
        errors: 0,
        total: 0,
      });
    }

    const payplusPayments = rawData.data;
    console.log(`📦 Found ${payplusPayments.length} payments in PayPlus`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const payment of payplusPayments) {
      try {
        // Check if already exists in our DB
        const { data: existing } = await supabaseAdmin
          .from('recurring_payments')
          .select('id')
          .eq('recurring_uid', payment.uid)
          .single();

        if (existing) {
          console.log(`⏭️ Skipping ${payment.uid} - already exists`);
          skippedCount++;
          continue;
        }

        // Try to find matching user by email
        let userId = null;
        if (payment.customer_email) {
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', payment.customer_email)
            .single();
          
          if (user) userId = user.id;
        }

        if (!userId) {
          console.log(`⚠️ No user found for ${payment.customer_email}, skipping`);
          skippedCount++;
          continue;
        }

        // Convert recurring_type from text to number
        let recurringType = 2; // default monthly
        if (payment.recurring_type === 'daily') recurringType = 0;
        else if (payment.recurring_type === 'weekly') recurringType = 1;
        else if (payment.recurring_type === 'monthly') recurringType = 2;

        // Parse start date (format: DD/MM/YYYY)
        const [day, month, year] = payment.start_date.split('/');
        const startDate = new Date(`${year}-${month}-${day}`);
        
        // Calculate next charge date
        const nextChargeDate = new Date(startDate);
        if (recurringType === 2) {
          nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
        } else if (recurringType === 1) {
          nextChargeDate.setDate(nextChargeDate.getDate() + 7);
        } else if (recurringType === 0) {
          nextChargeDate.setDate(nextChargeDate.getDate() + 1);
        }

        // Parse number_of_charges
        const numCharges = payment.number_of_charges === 'unlimited' ? 0 : parseInt(payment.number_of_charges) || 0;

        // Insert into our DB
        const { error: insertError } = await supabaseAdmin
          .from('recurring_payments')
          .insert({
            user_id: userId,
            plan_id: null,
            recurring_uid: payment.uid,
            customer_uid: payment.customer_uid,
            card_token: null, // PayPlus doesn't return the token
            recurring_type: recurringType,
            recurring_range: 1,
            number_of_charges: numCharges,
            start_date: startDate.toISOString(),
            next_charge_date: nextChargeDate.toISOString(),
            amount: parseFloat(payment.each_payment_amount) || 0,
            currency_code: 'ILS',
            items: [{
              name: 'מנוי חודשי',
              quantity: 1,
              price: parseFloat(payment.each_payment_amount) || 0,
              vat_type: 0,
            }],
            is_active: true,
            is_valid: payment.valid === true,
            extra_info: JSON.stringify(payment),
            notes: 'סונכרן מ-PayPlus',
          });

        if (insertError) {
          console.error(`❌ Error inserting ${payment.uid}:`, insertError);
          errorCount++;
        } else {
          console.log(`✅ Synced ${payment.uid} for ${payment.customer_name}`);
          syncedCount++;
        }
      } catch (itemError) {
        console.error(`❌ Error processing payment:`, itemError);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `סונכרנו ${syncedCount} מנויים מ-PayPlus`,
      synced: syncedCount,
      skipped: skippedCount,
      errors: errorCount,
      total: payplusPayments.length,
    });
  } catch (error) {
    console.error('❌ Sync error:', error);
    console.error('❌ Stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack'
      },
      { status: 500 }
    );
  }
}
