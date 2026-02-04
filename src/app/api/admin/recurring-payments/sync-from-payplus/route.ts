import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { payplusClient } from '@/lib/payplusClient';
import { getIssuerSnapshot } from '@/lib/issuer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toRecurringMonth(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function parsePayPlusDate(input: string): Date | null {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const isoCandidate = new Date(raw);
  if (!Number.isNaN(isoCandidate.getTime())) return isoCandidate;

  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const hh = Number(m[4] || '0');
  const min = Number(m[5] || '0');
  const ss = Number(m[6] || '0');

  const d = new Date(Date.UTC(yyyy, mm - 1, dd, hh, min, ss));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

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
    
    const payplusPayments = (rawData && Array.isArray(rawData.data)) ? rawData.data : [];
    console.log(`📦 Found ${payplusPayments.length} payments in PayPlus`);

    const payplusUids = payplusPayments
      .map((p: any) => p?.uid)
      .filter((uid: any): uid is string => typeof uid === 'string' && uid.length > 0);

    let syncedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let deactivatedCount = 0;

    let receiptsCreated = 0;
    let receiptsSkipped = 0;
    let receiptsErrors = 0;

    for (const payment of payplusPayments) {
      try {
        // Try to find matching user by email first
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

        const lastChargeRaw =
          payment.last_payment_date ||
          payment.last_charge_date ||
          payment.last_payment ||
          payment.last_charge;

        const lastChargeDate = lastChargeRaw ? parsePayPlusDate(String(lastChargeRaw)) : null;

        // Prepare data object
        const paymentData = {
          user_id: userId,
          plan_id: null,
          recurring_uid: payment.uid,
          customer_uid: payment.customer_uid,
          card_token: null, // PayPlus doesn't return the token
          recurring_type: recurringType,
          recurring_range: 1,
          number_of_charges: numCharges,
          start_date: startDate.toISOString(),
          last_charge_date: lastChargeDate ? lastChargeDate.toISOString() : null,
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

        // Check if already exists in our DB
        const { data: existing } = await supabaseAdmin
          .from('recurring_payments')
          .select('id')
          .eq('recurring_uid', payment.uid)
          .single();

        if (existing) {
          // Update existing record
          const { error: updateError } = await supabaseAdmin
            .from('recurring_payments')
            .update(paymentData)
            .eq('id', existing.id);

          if (updateError) {
            console.error(`❌ Error updating ${payment.uid}:`, updateError);
            errorCount++;
          } else {
            console.log(`🔄 Updated ${payment.uid} for ${payment.customer_name}`);
            updatedCount++;
          }
        } else {
          // Insert new record
          const { error: insertError } = await supabaseAdmin
            .from('recurring_payments')
            .insert(paymentData);

          if (insertError) {
            console.error(`❌ Error inserting ${payment.uid}:`, insertError);
            errorCount++;
          } else {
            console.log(`✅ Created ${payment.uid} for ${payment.customer_name}`);
            syncedCount++;
          }
        }
      } catch (itemError) {
        console.error(`❌ Error processing payment:`, itemError);
        errorCount++;
      }
    }

    // Deactivate records that exist in our DB but no longer exist in PayPlus
    // This fixes the case where recurring orders were deleted in PayPlus but still show in Clearpoint.
    try {
      const nowIso = new Date().toISOString();

      // We only consider rows that were synced from PayPlus (best-effort heuristic).
      // If PayPlus returns 0 items, we mark all PayPlus-synced rows as inactive.
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
        console.error('❌ Error deactivating missing PayPlus records:', deactivateResult.error);
      } else {
        deactivatedCount = deactivateResult.data?.length || 0;
        if (deactivatedCount > 0) {
          console.log(`🗑️ Deactivated ${deactivatedCount} local records not found in PayPlus`);
        }
      }
    } catch (deactivateError) {
      console.error('❌ Deactivate-missing step failed:', deactivateError);
    }

    // -----------------------------------------------------
    // Auto-generate recurring receipts + email
    // Source of truth: PayPlus ViewRecurring -> last_payment_date
    // Idempotency: payments.metadata contains { recurring_uid, recurring_month }
    // -----------------------------------------------------
    try {
      const now = new Date();
      const currentMonth = toRecurringMonth(now);

      const { data: activeRecurring, error: activeRecurringError } = await supabaseAdmin
        .from('recurring_payments')
        .select('id, user_id, recurring_uid, amount, currency_code')
        .eq('is_active', true)
        .eq('is_valid', true)
        .not('recurring_uid', 'is', null);

      if (activeRecurringError) {
        throw activeRecurringError;
      }

      for (const rp of activeRecurring || []) {
        try {
          const recurringUid = rp.recurring_uid as string | null;
          if (!recurringUid) continue;

          const status = await payplusClient.getRecurringStatus(recurringUid);
          if (!status?.last_payment_date) {
            receiptsSkipped++;
            continue;
          }

          const paidAtDate = parsePayPlusDate(status.last_payment_date);
          if (!paidAtDate) {
            receiptsSkipped++;
            continue;
          }

          const paidMonth = toRecurringMonth(paidAtDate);
          if (paidMonth !== currentMonth) {
            receiptsSkipped++;
            continue;
          }

          const { data: existingPayment } = await supabaseAdmin
            .from('payments')
            .select('id')
            .eq('payment_type', 'recurring')
            .contains('metadata', {
              recurring_uid: recurringUid,
              recurring_month: paidMonth,
            })
            .maybeSingle();

          if (existingPayment) {
            receiptsSkipped++;
            continue;
          }

          const amount = Number(rp.amount) || Number(status.amount) || 0;
          const currency = (rp.currency_code as string | null) || 'ILS';

          const { data: userForSnapshot } = await supabaseAdmin
            .from('users')
            .select(
              'full_name, email, phone, address, customer_type, company_name, vat_number, business_city, business_postal_code, communication_email'
            )
            .eq('id', rp.user_id)
            .single();

          const billingSnapshot = {
            customer_type: (userForSnapshot as any)?.customer_type || null,
            company_name: (userForSnapshot as any)?.company_name || null,
            vat_number: (userForSnapshot as any)?.vat_number || null,
            business_city: (userForSnapshot as any)?.business_city || null,
            business_postal_code: (userForSnapshot as any)?.business_postal_code || null,
            communication_email: (userForSnapshot as any)?.communication_email || null,
            customer_name: (userForSnapshot as any)?.full_name || null,
            customer_email: (userForSnapshot as any)?.email || null,
            customer_phone: (userForSnapshot as any)?.phone || null,
            customer_address: (userForSnapshot as any)?.address || null,
          };

          const issuerSnapshot = {
            ...getIssuerSnapshot(currency),
          };

          const { data: newPayment, error: paymentError } = await supabaseAdmin
            .from('payments')
            .insert({
              user_id: rp.user_id,
              amount,
              currency,
              status: 'completed',
              payment_type: 'recurring',
              payment_provider: 'payplus',
              description: `חיוב חודשי אוטומטי - ${paidAtDate.toLocaleDateString('he-IL')}`,
              paid_at: paidAtDate.toISOString(),
              metadata: {
                recurring_payment_id: rp.id,
                recurring_uid: recurringUid,
                recurring_month: paidMonth,
                payplus_last_payment_date: status.last_payment_date,
              },
            })
            .select('id')
            .single();

          if (paymentError || !newPayment) {
            console.error('❌ [SYNC] Failed to create recurring payment record:', paymentError);
            receiptsErrors++;
            continue;
          }

          let createdInvoice: any = null;
          let attempts = 0;
          const maxAttempts = 3;

          while (!createdInvoice && attempts < maxAttempts) {
            attempts++;

            const { data: invoiceNumber, error: numberError } = await supabaseAdmin.rpc(
              'generate_invoice_number'
            );

            if (numberError || !invoiceNumber) {
              console.error('❌ [SYNC] Failed to generate invoice number:', numberError);
              break;
            }

            const { data: invoice, error: invoiceError } = await supabaseAdmin
              .from('invoices')
              .insert({
                user_id: rp.user_id,
                invoice_number: invoiceNumber,
                document_type: 'invoice',
                status: 'paid',
                total_amount: amount,
                currency,
                payment_id: newPayment.id,
                has_subscription: true,
                monthly_price: amount,
                paid_at: paidAtDate.toISOString(),
                sent_at: new Date().toISOString(),
                billing_snapshot: billingSnapshot,
                issuer_snapshot: issuerSnapshot,
                notes: `קבלה אוטומטית - הוראת קבע\nRecurring UID: ${recurringUid}\nRecurring Month: ${paidMonth}`,
              })
              .select('id, invoice_number')
              .single();

            if (!invoiceError && invoice) {
              createdInvoice = invoice;
              break;
            }

            if ((invoiceError as any)?.code === '23505') {
              continue;
            }

            console.error('❌ [SYNC] Failed to create recurring receipt:', invoiceError);
            break;
          }

          if (!createdInvoice) {
            receiptsErrors++;
            continue;
          }

          await supabaseAdmin
            .from('invoice_items')
            .insert({
              invoice_id: createdInvoice.id,
              item_type: 'subscription',
              item_name: 'מנוי חודשי',
              item_description: `מנוי לשירות Clearpoint Security - ${paidAtDate.toLocaleDateString('he-IL', {
                month: 'long',
                year: 'numeric',
              })}`,
              quantity: 1,
              unit_price: amount,
              total_price: amount,
              sort_order: 0,
            });

          await supabaseAdmin
            .from('payments')
            .update({ invoice_id: createdInvoice.id, invoice_number: createdInvoice.invoice_number })
            .eq('id', newPayment.id);

          try {
            const { data: invoiceToEmail } = await supabaseAdmin
              .from('invoices')
              .select(
                'id, invoice_number, created_at, total_amount, email_sent_at, user:users!invoices_user_id_fkey(full_name, email)'
              )
              .eq('id', createdInvoice.id)
              .single();

            const emailUser = Array.isArray((invoiceToEmail as any)?.user)
              ? (invoiceToEmail as any).user[0]
              : (invoiceToEmail as any)?.user;

            if (emailUser?.email && !(invoiceToEmail as any)?.email_sent_at) {
              const { sendInvoiceEmail } = await import('@/lib/email');
              await sendInvoiceEmail({
                customerName: emailUser.full_name || emailUser.email,
                customerEmail: emailUser.email,
                invoiceNumber: (invoiceToEmail as any).invoice_number,
                invoiceDate: new Date((invoiceToEmail as any).created_at).toLocaleDateString('he-IL'),
                totalAmount: (invoiceToEmail as any).total_amount,
                items: [
                  {
                    name: 'מנוי חודשי',
                    description: `מנוי לשירות Clearpoint Security - ${paidAtDate.toLocaleDateString('he-IL', {
                      month: 'long',
                      year: 'numeric',
                    })}`,
                    quantity: 1,
                    price: amount,
                  },
                ],
                invoiceUrl: `${process.env.NODE_ENV === 'production' ? 'https://www.clearpoint.co.il' : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')}/invoice/${createdInvoice.id}`,
                isMonthlyRecurring: true,
              });

              await supabaseAdmin
                .from('invoices')
                .update({ email_sent_at: new Date().toISOString() })
                .eq('id', createdInvoice.id)
                .is('email_sent_at', null);
            }
          } catch (emailError) {
            console.error('⚠️ [SYNC] Failed to send recurring receipt email:', emailError);
          }

          receiptsCreated++;
        } catch (innerError) {
          console.error('❌ [SYNC] Recurring receipt creation error:', innerError);
          receiptsErrors++;
        }
      }
    } catch (receiptPassError) {
      console.error('❌ [SYNC] Recurring receipts pass failed:', receiptPassError);
      receiptsErrors++;
    }

    return NextResponse.json({
      success: true,
      message: `סונכרנו ${syncedCount} מנויים חדשים, עודכנו ${updatedCount} מנויים קיימים, בוטלו ${deactivatedCount} מנויים שנמחקו ב-PayPlus. קבלות: נוצרו ${receiptsCreated}, דולגו ${receiptsSkipped}, שגיאות ${receiptsErrors}`,
      synced: syncedCount,
      updated: updatedCount,
      skipped: skippedCount,
      deactivated: deactivatedCount,
      errors: errorCount,
      receiptsCreated,
      receiptsSkipped,
      receiptsErrors,
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
