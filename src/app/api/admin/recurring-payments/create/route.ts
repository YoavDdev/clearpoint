import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRecurringPaymentPage, createPayPlusCustomer } from '@/lib/payplus';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      plan_id,
      customer_uid,
      card_token,
      recurring_type = 2,
      recurring_range = 1,
      number_of_charges = 0,
      start_date,
      end_date,
      amount,
      currency_code = 'ILS',
      items,
      extra_info,
      notes,
    } = body;

    if (!user_id || !amount || !items) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, amount, items' },
        { status: 400 }
      );
    }

    // Fetch user data to get/create customer_uid
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let finalCustomerUid = customer_uid || user.customer_uid;

    // If no customer_uid, check if exists in PayPlus first, then create if needed
    if (!finalCustomerUid) {
      console.log('🔍 Checking if customer exists in PayPlus:', user.email);
      
      // Check if customer already exists in PayPlus
      // Note: PayPlus doesn't have a direct search by email, but we can check via customer_number (our user_id)
      // For now, we'll create a new customer. In production, consider implementing customer search.
      
      console.log('🔵 Creating PayPlus customer for user:', user.email);
      
      // Format phone number for PayPlus (Israeli format: +972XXXXXXXXX or 0XXXXXXXXX)
      let formattedPhone = user.phone || '';
      if (formattedPhone) {
        // Remove spaces, dashes, etc
        formattedPhone = formattedPhone.replace(/[\s\-()]/g, '');
        
        // If starts with 0, convert to +972
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '+972' + formattedPhone.substring(1);
        }
        // If doesn't start with +, assume Israeli and add +972
        else if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+972' + formattedPhone;
        }
      }
      
      const payplusCustomerResult = await createPayPlusCustomer({
        email: user.email,
        customer_name: user.full_name || user.email,
        phone: formattedPhone,
        business_address: user.address || '',
        notes: `Auto-created for recurring payment on ${new Date().toISOString()}`,
        customer_number: user.id, // Use user_id as unique identifier
      });

      if (payplusCustomerResult.success && payplusCustomerResult.customer_uid) {
        finalCustomerUid = payplusCustomerResult.customer_uid;
        console.log('✅ PayPlus customer created:', finalCustomerUid);
        
        // Update user with new customer_uid
        await supabaseAdmin
          .from('users')
          .update({ customer_uid: finalCustomerUid })
          .eq('id', user_id);
      } else {
        console.error('❌ Failed to create PayPlus customer:', payplusCustomerResult.error);
        
        // If error is about duplicate, try to extract existing customer_uid from error
        if (payplusCustomerResult.error?.includes('already exists') || 
            payplusCustomerResult.error?.includes('duplicate')) {
          console.log('⚠️ Customer might already exist in PayPlus');
          // Could implement customer search here
        }
        
        return NextResponse.json(
          { error: 'Failed to create PayPlus customer', details: payplusCustomerResult.error },
          { status: 400 }
        );
      }
    }

    // Create Payment Page instead of direct recurring payment
    // Customer will enter their card details via the link
    console.log('🔵 Creating Payment Page for recurring payment');
    
    // Get plan name for display
    const planName = items[0]?.name || 'מנוי חודשי';
    
    const paymentPageResponse = await createRecurringPaymentPage({
      customer_uid: finalCustomerUid,
      customer_name: user.full_name || user.email,
      customer_email: user.email,
      customer_phone: user.phone || '',
      amount: amount,
      plan_name: planName,
      start_date: start_date, // Already in DD/MM/YYYY format
      recurring_type: recurring_type,
      recurring_range: recurring_range,
      number_of_charges: number_of_charges,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/recurring-payment-success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled`,
      custom_fields: {
        cField1: user_id, // For webhook handling
        cField2: plan_id,
        cField3: amount.toString(),
      },
    });

    console.log('📥 Payment Page response:', paymentPageResponse);

    if (paymentPageResponse.status !== '1' || !paymentPageResponse.data?.pageUrl) {
      return NextResponse.json(
        { error: 'Failed to create payment page', details: paymentPageResponse.err },
        { status: 400 }
      );
    }

    // Save pending recurring payment to database
    const { data: recurringPayment, error: dbError } = await supabaseAdmin
      .from('recurring_payments')
      .insert({
        user_id,
        plan_id,
        provider: 'payplus',
        provider_recurring_id: paymentPageResponse.data.processId, // Will be updated by webhook
        status: 'pending', // Will be activated when customer completes payment
        amount: amount.toString(),
        currency: currency_code,
        interval_type: recurring_type === 2 ? 'monthly' : 'daily',
        interval_count: recurring_range,
        metadata: {
          items,
          extra_info,
          payment_page_url: paymentPageResponse.data.pageUrl,
          start_date,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving to database:', dbError);
      // Continue anyway - webhook will handle it
    }

    return NextResponse.json({
      success: true,
      payment_url: paymentPageResponse.data.pageUrl,
      recurring_payment: recurringPayment,
      message: 'Payment page created. Send this link to the customer to complete setup.',
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
