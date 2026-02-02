import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { payplusClient } from '@/lib/payplusClient';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
    let receiptsCreated = 0;
    let receiptsSkipped = 0;
    let receiptsErrors = 0;

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

    // -----------------------------------------------------
    // Auto-generate recurring receipts (no email for now)
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

          const paidAtDate = new Date(status.last_payment_date);
          if (Number.isNaN(paidAtDate.getTime())) {
            receiptsSkipped++;
            continue;
          }

          const paidMonth = toRecurringMonth(paidAtDate);
          if (paidMonth !== currentMonth) {
            receiptsSkipped++;
            continue;
          }

          // Idempotency check (same recurring_uid + month)
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
            customer_type: userForSnapshot?.customer_type || null,
            company_name: userForSnapshot?.company_name || null,
            vat_number: userForSnapshot?.vat_number || null,
            business_city: userForSnapshot?.business_city || null,
            business_postal_code: userForSnapshot?.business_postal_code || null,
            communication_email: userForSnapshot?.communication_email || null,
            customer_name: userForSnapshot?.full_name || null,
            customer_email: userForSnapshot?.email || null,
            customer_phone: userForSnapshot?.phone || null,
            customer_address: userForSnapshot?.address || null,
          };

          const issuerSnapshot = {
            brand_name: 'ClearPoint',
            issuer_type: 'exempt',
            vat_rate: 0,
            currency,
          };

          // Create payment
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
            console.error('❌ [CRON] Failed to create recurring payment record:', paymentError);
            receiptsErrors++;
            continue;
          }

          // Create receipt (invoice document)
          let createdInvoice: any = null;
          let attempts = 0;
          const maxAttempts = 3;

          while (!createdInvoice && attempts < maxAttempts) {
            attempts++;

            const { data: invoiceNumber, error: numberError } = await supabaseAdmin.rpc(
              'generate_invoice_number'
            );

            if (numberError || !invoiceNumber) {
              console.error('❌ [CRON] Failed to generate invoice number:', numberError);
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

            if (invoiceError?.code === '23505') {
              console.log(
                `Invoice number ${invoiceNumber} already exists, retrying generation...`
              );
              continue;
            }

            console.error('❌ [CRON] Failed to create recurring receipt:', invoiceError);
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

          // Link payment <-> invoice (best-effort)
          await supabaseAdmin
            .from('payments')
            .update({ invoice_id: createdInvoice.id, invoice_number: createdInvoice.invoice_number })
            .eq('id', newPayment.id);

          try {
            const { data: invoiceToEmail } = await supabaseAdmin
              .from('invoices')
              .select('id, invoice_number, created_at, total_amount, email_sent_at, user:users(full_name, email)')
              .eq('id', createdInvoice.id)
              .single();

            if (invoiceToEmail?.user?.email && !invoiceToEmail.email_sent_at) {
              const { sendInvoiceEmail } = await import('@/lib/email');
              await sendInvoiceEmail({
                customerName: invoiceToEmail.user.full_name || invoiceToEmail.user.email,
                customerEmail: invoiceToEmail.user.email,
                invoiceNumber: invoiceToEmail.invoice_number,
                invoiceDate: new Date(invoiceToEmail.created_at).toLocaleDateString('he-IL'),
                totalAmount: invoiceToEmail.total_amount,
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
            console.error('⚠️ [CRON] Failed to send recurring receipt email:', emailError);
          }

          receiptsCreated++;
        } catch (innerError) {
          console.error('❌ [CRON] Recurring receipt creation error:', innerError);
          receiptsErrors++;
        }
      }
    } catch (receiptPassError) {
      console.error('❌ [CRON] Recurring receipts pass failed:', receiptPassError);
      receiptsErrors++;
    }

    console.log(
      `✅ [CRON] PayPlus sync completed. synced=${syncedCount} updated=${updatedCount} deactivated=${deactivatedCount} skipped=${skippedCount} errors=${errorCount} receiptsCreated=${receiptsCreated} receiptsSkipped=${receiptsSkipped} receiptsErrors=${receiptsErrors}`
    );

    return NextResponse.json({
      success: true,
      message: `synced=${syncedCount}, updated=${updatedCount}, deactivated=${deactivatedCount}, skipped=${skippedCount}, errors=${errorCount}, receiptsCreated=${receiptsCreated}, receiptsSkipped=${receiptsSkipped}, receiptsErrors=${receiptsErrors}`,
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
