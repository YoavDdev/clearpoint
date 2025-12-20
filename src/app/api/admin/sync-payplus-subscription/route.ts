import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const PAYPLUS_CONFIG = {
  apiKey: process.env.PAYPLUS_API_KEY!,
  secretKey: process.env.PAYPLUS_SECRET_KEY!,
  apiUrl: process.env.PAYPLUS_API_URL || 'https://restapi.payplus.co.il',
};

/**
 * 🔄 API לסנכרון מנוי מ-PayPlus
 * שולף את פרטי הוראת הקבע מ-PayPlus ויוצר/מעדכן את המנוי במערכת
 * 
 * POST /api/admin/sync-payplus-subscription
 * Body: { userId: "xxx", customerUid: "xxx" } או { recurringUid: "xxx" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, customerUid, recurringUid } = body;

    if (!userId && !customerUid && !recurringUid) {
      return NextResponse.json(
        { success: false, error: "userId + customerUid או recurringUid נדרשים" },
        { status: 400 }
      );
    }

    console.log('🔄 Syncing PayPlus subscription...');
    console.log(`User ID: ${userId}, Customer UID: ${customerUid}, Recurring UID: ${recurringUid}`);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // שלב 1: שלוף את פרטי המנוי מ-PayPlus
    let payplusData;
    
    if (customerUid) {
      // שלוף לפי Customer UID - כל המנויים של הלקוח
      const response = await fetch(
        `${PAYPLUS_CONFIG.apiUrl}/api/v1.0/RecurringPayments/View`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': JSON.stringify({
              api_key: PAYPLUS_CONFIG.apiKey,
              secret_key: PAYPLUS_CONFIG.secretKey,
            }),
          },
          body: JSON.stringify({
            customer_uid: customerUid,
          }),
        }
      );

      payplusData = await response.json();
      console.log('📥 PayPlus response:', JSON.stringify(payplusData, null, 2));

      if (!response.ok || payplusData.results?.status !== 'success') {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch from PayPlus', details: payplusData },
          { status: 500 }
        );
      }

      // קח את המנוי הפעיל הראשון
      const recurring = payplusData.data?.recurring_payments?.[0];
      if (!recurring) {
        return NextResponse.json(
          { success: false, error: 'No active recurring payments found for this customer' },
          { status: 404 }
        );
      }
      
      payplusData = { data: recurring };
      
    } else if (recurringUid) {
      // שלוף לפי Recurring UID - מנוי ספציפי
      const response = await fetch(
        `${PAYPLUS_CONFIG.apiUrl}/api/v1.0/RecurringPayments/ViewRecurring`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': JSON.stringify({
              api_key: PAYPLUS_CONFIG.apiKey,
              secret_key: PAYPLUS_CONFIG.secretKey,
            }),
          },
          body: JSON.stringify({
            recurring_uid: recurringUid,
          }),
        }
      );

      payplusData = await response.json();
      console.log('📥 PayPlus response:', JSON.stringify(payplusData, null, 2));

      if (!response.ok || payplusData.results?.status !== 'success') {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch from PayPlus', details: payplusData },
          { status: 500 }
        );
      }
    }

    const recurring = payplusData.data;
    
    // שלב 2: חלץ את הנתונים החשובים
    const amount = parseFloat(recurring.amount || recurring.recurring_amount || '0');
    const nextChargeDate = recurring.next_charge_date || recurring.start_date;
    const lastChargeDate = recurring.last_charge_date;
    const status = recurring.status === 'active' ? 'active' : 'pending';

    console.log(`💰 Amount: ${amount}, Status: ${status}`);
    console.log(`📅 Next charge: ${nextChargeDate}, Last charge: ${lastChargeDate}`);

    // שלב 3: מצא או צור את המנוי במערכת
    let targetUserId = userId;
    
    // אם אין userId, נסה לחלץ מ-more_info או מ-customer
    if (!targetUserId && recurring.more_info) {
      const parts = recurring.more_info.split('|');
      targetUserId = parts[0]; // נניח שה-userId הוא החלק הראשון
    }

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Could not determine user ID. Please provide userId in request.' },
        { status: 400 }
      );
    }

    // בדוק אם המשתמש קיים
    const { data: user } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', targetUserId)
      .single();

    if (!user) {
      return NextResponse.json(
        { success: false, error: `User not found: ${targetUserId}` },
        { status: 404 }
      );
    }

    // בדוק אם כבר יש מנוי
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('status', 'active')
      .single();

    let subscription;

    if (existingSubscription) {
      // עדכן מנוי קיים
      const { data: updated, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          recurring_uid: recurring.recurring_uid || recurringUid,
          payplus_customer_uid: recurring.customer_uid || customerUid,
          amount: amount,
          last_payment_date: lastChargeDate || null,
          next_payment_date: nextChargeDate,
          payment_failures: 0,
          auto_renew: true,
          status: status,
        })
        .eq('id', existingSubscription.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Failed to update subscription:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update subscription', details: updateError },
          { status: 500 }
        );
      }

      subscription = updated;
      console.log('✅ Subscription updated:', subscription.id);
      
    } else {
      // צור מנוי חדש
      const { data: created, error: createError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: targetUserId,
          recurring_uid: recurring.recurring_uid || recurringUid,
          payplus_customer_uid: recurring.customer_uid || customerUid,
          amount: amount,
          currency: 'ILS',
          billing_cycle: 'monthly',
          status: status,
          last_payment_date: lastChargeDate || null,
          next_payment_date: nextChargeDate,
          payment_failures: 0,
          auto_renew: true,
          payment_method: 'credit_card',
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create subscription:', createError);
        return NextResponse.json(
          { success: false, error: 'Failed to create subscription', details: createError },
          { status: 500 }
        );
      }

      subscription = created;
      console.log('✅ Subscription created:', subscription.id);
    }

    // שלב 4: אם היה חיוב - צור גם חשבונית
    if (lastChargeDate && amount > 0) {
      console.log('📄 Creating invoice for last charge...');

      // בדוק אם כבר יש חשבונית לתאריך הזה
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('user_id', targetUserId)
        .gte('created_at', new Date(lastChargeDate).toISOString())
        .single();

      if (!existingInvoice) {
        const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');

        const { data: invoice } = await supabase
          .from('invoices')
          .insert({
            user_id: targetUserId,
            invoice_number: invoiceNumber || `INV-${Date.now()}`,
            status: 'paid',
            total_amount: amount,
            currency: 'ILS',
            paid_at: lastChargeDate,
            notes: `חיוב חודשי אוטומטי - סונכרן מ-PayPlus`,
            has_subscription: true,
          })
          .select()
          .single();

        if (invoice) {
          // הוסף פריט
          await supabase
            .from('invoice_items')
            .insert({
              invoice_id: invoice.id,
              item_type: 'subscription',
              item_name: 'מנוי חודשי Clearpoint Security',
              item_description: `תקופה: ${new Date(lastChargeDate).toLocaleDateString('he-IL')}`,
              quantity: 1,
              unit_price: amount,
              total_price: amount,
              sort_order: 0,
            });

          console.log(`✅ Invoice created: ${invoice.invoice_number}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription synced successfully from PayPlus',
      data: {
        subscription: {
          id: subscription.id,
          user_id: subscription.user_id,
          status: subscription.status,
          amount: subscription.amount,
          next_payment_date: subscription.next_payment_date,
          recurring_uid: subscription.recurring_uid,
        },
        payplus: {
          recurring_uid: recurring.recurring_uid,
          customer_uid: recurring.customer_uid,
          amount: amount,
          status: recurring.status,
          next_charge: nextChargeDate,
        },
      },
    });

  } catch (error) {
    console.error('❌ Error syncing PayPlus subscription:', error);
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
