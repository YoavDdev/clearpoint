import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const isVercelCron = req.headers.get('x-vercel-cron') === '1';

    // Support both:
    // 1) Protected manual calls (Authorization: Bearer CRON_SECRET)
    // 2) Vercel Cron calls (x-vercel-cron: 1)
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !isVercelCron) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🤖 [CRON] Starting PayPlus recurring payments sync...');

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

    const payplusPayments = (rawData && Array.isArray(rawData.data)) ? rawData.data : [];
    console.log(`📦 [CRON] Found ${payplusPayments.length} payments in PayPlus`);

    const payplusUids = payplusPayments
      .map((p: any) => p?.uid)
      .filter((uid: any): uid is string => typeof uid === 'string' && uid.length > 0);

    let syncedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let deactivatedCount = 0;

    for (const payment of payplusPayments) {
      try {
        let userId: string | null = null;
        if (payment.customer_email) {
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', payment.customer_email)
            .single();

          if (user) userId = user.id;
        }

        if (!userId) {
          console.log(`⚠️ [CRON] No user found for ${payment.customer_email}, skipping`);
          skippedCount++;
          continue;
        }

        let recurringType = 2;
        if (payment.recurring_type === 'daily') recurringType = 0;
        else if (payment.recurring_type === 'weekly') recurringType = 1;
        else if (payment.recurring_type === 'monthly') recurringType = 2;

        const [day, month, year] = payment.start_date.split('/');
        const startDate = new Date(`${year}-${month}-${day}`);

        const nextChargeDate = new Date(startDate);
        if (recurringType === 2) {
          nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
        } else if (recurringType === 1) {
          nextChargeDate.setDate(nextChargeDate.getDate() + 7);
        } else if (recurringType === 0) {
          nextChargeDate.setDate(nextChargeDate.getDate() + 1);
        }

        const numCharges = payment.number_of_charges === 'unlimited' ? 0 : parseInt(payment.number_of_charges) || 0;

        const paymentData = {
          user_id: userId,
          plan_id: null,
          recurring_uid: payment.uid,
          customer_uid: payment.customer_uid,
          card_token: null,
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
          updated_at: new Date().toISOString(),
        };

        const { data: existing } = await supabaseAdmin
          .from('recurring_payments')
          .select('id')
          .eq('recurring_uid', payment.uid)
          .single();

        if (existing) {
          const { error: updateError } = await supabaseAdmin
            .from('recurring_payments')
            .update(paymentData)
            .eq('id', existing.id);

          if (updateError) {
            console.error(`❌ [CRON] Error updating ${payment.uid}:`, updateError);
            errorCount++;
          } else {
            updatedCount++;
          }
        } else {
          const { error: insertError } = await supabaseAdmin
            .from('recurring_payments')
            .insert(paymentData);

          if (insertError) {
            console.error(`❌ [CRON] Error inserting ${payment.uid}:`, insertError);
            errorCount++;
          } else {
            syncedCount++;
          }
        }
      } catch (itemError) {
        console.error('❌ [CRON] Error processing recurring payment item:', itemError);
        errorCount++;
      }
    }

    try {
      const nowIso = new Date().toISOString();

      const baseDeactivateQuery = supabaseAdmin
        .from('recurring_payments')
        .update({
          is_active: false,
          updated_at: nowIso,
          notes: 'סונכרן מ-PayPlus (נמחק/לא קיים ב-PayPlus)',
        })
        .eq('is_active', true)
        .not('notes', 'is', null)
        .ilike('notes', '%PayPlus%');

      let deactivateResult;
      if (payplusUids.length === 0) {
        deactivateResult = await baseDeactivateQuery.select('id');
      } else {
        const inList = `(${payplusUids
          .map((uid: string) => `"${uid.replace(/\"/g, '')}"`)
          .join(',')})`;
        deactivateResult = await baseDeactivateQuery
          .not('recurring_uid', 'in', inList)
          .select('id');
      }

      if (deactivateResult.error) {
        console.error('❌ [CRON] Error deactivating missing PayPlus records:', deactivateResult.error);
      } else {
        deactivatedCount = deactivateResult.data?.length || 0;
      }
    } catch (deactivateError) {
      console.error('❌ [CRON] Deactivate-missing step failed:', deactivateError);
    }

    console.log(
      `✅ [CRON] PayPlus sync completed. synced=${syncedCount} updated=${updatedCount} deactivated=${deactivatedCount} skipped=${skippedCount} errors=${errorCount}`
    );

    return NextResponse.json({
      success: true,
      message: `synced=${syncedCount}, updated=${updatedCount}, deactivated=${deactivatedCount}, skipped=${skippedCount}, errors=${errorCount}`,
      synced: syncedCount,
      updated: updatedCount,
      skipped: skippedCount,
      deactivated: deactivatedCount,
      errors: errorCount,
      total: payplusPayments.length,
    });
  } catch (error) {
    console.error('❌ [CRON] Sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
