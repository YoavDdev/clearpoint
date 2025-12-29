import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendInvoiceEmail } from "@/lib/email-service";
import { verifyWebhookSignature, parseWebhookData } from "@/lib/payplus";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // ✅ חשוב - מבטיח שזה רץ ב-Node.js ולא ב-Edge

/**
 * POST /api/webhooks/payplus/recurring
 * Webhook לקבלת עדכונים על חיובים חודשיים מ-PayPlus או Zapier
 * 
 * PayPlus/Zapier שולחים webhook אוטומטית כל פעם שמתבצע חיוב חודשי
 * (הצלחה או כשלון)
 */
export async function POST(req: NextRequest) {
  try {
    console.log("🔔 Received PayPlus recurring webhook");

    // שלב 1: אימות ש-webhook באמת מגיע מ-PayPlus או Zapier
    const userAgent = req.headers.get('user-agent') || '';
    const receivedHash = req.headers.get('hash') || '';
    const body = await req.text();
    const payload = JSON.parse(body);

    // זיהוי מקור: Zapier או PayPlus ישיר
    const isFromZapier = payload.source === 'zapier' || userAgent.toLowerCase().includes('zapier');
    
    console.log(`📥 Webhook source: ${isFromZapier ? 'Zapier' : 'PayPlus Direct'}`);

    // אימות signature (רק אם זה מגיע ישירות מ-PayPlus, לא דרך Zapier)
    if (!isFromZapier && process.env.PAYPLUS_USE_MOCK !== 'true') {
      const isValid = verifyWebhookSignature(payload, receivedHash, userAgent);
      if (!isValid) {
        console.error("❌ Invalid webhook signature");
        return NextResponse.json(
          { success: false, error: "Invalid signature" },
          { status: 401 }
        );
      }
      console.log("✅ Webhook signature verified");
    } else if (isFromZapier) {
      console.log("✅ Zapier webhook accepted (no signature validation needed)");
    }

    console.log("📦 Payload:", JSON.stringify(payload, null, 2));

    // שלב 2: פרסור הנתונים מ-PayPlus
    const webhookData = parseWebhookData(payload);
    
    // חלץ מייל מה-payload (PayPlus שולח את המייל של הלקוח)
    const customerEmail = payload.customer_email || payload.email || payload.buyer_email || null;
    console.log(`📧 Customer email from payload: ${customerEmail}`);
    
    // שלב 3: מצא את המנוי לפי recurring_uid או customer_uid
    // תמיכה במבנים שונים: ישיר, nested, או דרך Zapier
    let recurringUid = payload.recurring_uid 
      || payload.data?.recurring_uid 
      || payload.payload?.data?.recurring_uid
      || payload.payload?.recurring_uid;
    
    let customerUid = payload.customer_uid
      || payload.data?.customer_uid
      || payload.data?.data?.customer_uid
      || payload.payload?.customer_uid;
    
    // חלץ user_id מתוך more_info (פורמט: "user_id|recurring|monthly")
    let moreInfo = payload.more_info
      || payload.data?.more_info
      || payload.data?.data?.more_info
      || payload.payload?.more_info;
    
    let userIdFromMoreInfo;
    if (moreInfo && typeof moreInfo === 'string') {
      const parts = moreInfo.split('|');
      if (parts.length > 0) {
        userIdFromMoreInfo = parts[0]; // ה-user_id האמיתי שלך!
        console.log(`📋 Extracted user_id from more_info: ${userIdFromMoreInfo}`);
      }
    }
    
    // אם Zapier שולח את כל ה-payload בתוך payload.payload
    if (isFromZapier && payload.payload && typeof payload.payload === 'string') {
      try {
        const nestedPayload = JSON.parse(payload.payload);
        recurringUid = recurringUid || nestedPayload.data?.recurring_uid || nestedPayload.recurring_uid;
        customerUid = customerUid || nestedPayload.data?.customer_uid || nestedPayload.customer_uid;
      } catch (e) {
        console.log("⚠️ Could not parse nested payload");
      }
    }
    
    // חלץ transaction_uid למקרה שנצטרך אותו
    const transactionUid = payload.transaction_uid
      || payload.data?.transaction_uid
      || payload.data?.transaction?.transaction_uid
      || payload.payload?.transaction_uid;
    
    // בדוק שיש לפחות אחד מהמזהים
    if (!recurringUid && !customerUid && !userIdFromMoreInfo && !transactionUid) {
      console.error("❌ Missing all identifiers in webhook");
      console.error("📦 Full payload for debugging:", JSON.stringify(payload, null, 2));
      return NextResponse.json(
        { success: false, error: "Missing subscription identifiers" },
        { status: 400 }
      );
    }
    
    console.log(`🔍 Identifiers found - recurring_uid: ${recurringUid}, user_id: ${userIdFromMoreInfo}, customer_uid: ${customerUid}, transaction_uid: ${transactionUid}`);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // נסה למצוא את המנוי - קודם לפי recurring_uid, אחר כך לפי user_id מ-more_info
    let subscription;
    let subError;
    
    if (recurringUid) {
      console.log(`🔍 Searching subscription by recurring_uid: ${recurringUid}`);
      const result = await supabase
        .from("subscriptions")
        .select("*")
        .eq("recurring_uid", recurringUid)
        .single();
      subscription = result.data;
      subError = result.error;
    }
    
    // אם לא מצאנו לפי recurring_uid, נסה לפי user_id מ-more_info
    if ((!subscription || subError) && userIdFromMoreInfo) {
      console.log(`🔍 Subscription not found by recurring_uid, trying user_id from more_info: ${userIdFromMoreInfo}`);
      
      const result = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userIdFromMoreInfo)
        .eq("status", "active")
        .single();
      subscription = result.data;
      subError = result.error;
    }
    
    // אם עדיין לא מצאנו, נסה לפי payplus_customer_uid (PayPlus customer ID)
    if ((!subscription || subError) && customerUid) {
      console.log(`🔍 Still not found, trying payplus_customer_uid: ${customerUid}`);
      
      const result = await supabase
        .from("subscriptions")
        .select("*")
        .eq("payplus_customer_uid", customerUid)
        .eq("status", "active")
        .single();
      subscription = result.data;
      subError = result.error;
      
      // אם לא מצאנו, נסה גם לפי user_id (fallback למקרים ישנים)
      if (!subscription && customerUid) {
        console.log(`🔍 Trying user_id as last resort: ${customerUid}`);
        const result2 = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", customerUid)
          .eq("status", "active")
          .single();
        subscription = result2.data;
        subError = result2.error;
      }
    }
    
    // אם עדיין לא מצאנו ויש transaction_uid, חפש לפי חיוב קודם
    if ((!subscription || subError) && transactionUid) {
      console.log(`🔍 Trying to find via previous charge with transaction_uid: ${transactionUid}`);
      
      // חפש בטבלת subscription_charges
      const { data: previousCharge } = await supabase
        .from("subscription_charges")
        .select("subscription_id, subscriptions(*)")
        .eq("transaction_id", transactionUid)
        .single();
      
      if (previousCharge?.subscriptions) {
        subscription = previousCharge.subscriptions;
        subError = null;
        console.log(`✅ Found subscription via transaction_uid!`);
      }
    }

    // אם לא מצאנו subscription, ננסה ליצור אחד אוטומטית!
    if (subError || !subscription) {
      console.log("⚠️ Subscription not found - attempting to create automatically");
      console.log(`Identifiers: recurring_uid=${recurringUid}, user_id=${userIdFromMoreInfo}, customer_uid=${customerUid}`);
      
      // נסה למצוא את המשתמש - 3 אפשרויות זיהוי
      let user = null;
      let userError = null;
      
      // אפשרות 1: זיהוי לפי customer_email
      if (customerEmail) {
        console.log(`🔍 [1/3] Searching user by email: ${customerEmail}`);
        const result = await supabase
          .from("users")
          .select("id, full_name, email, plan_id, customer_uid")
          .eq("email", customerEmail)
          .single();
        user = result.data;
        userError = result.error;
        
        if (user) {
          console.log(`✅ User found by email: ${user.full_name}`);
          
          // שמור את customer_uid אם עדיין לא שמור
          if (customerUid && !user.customer_uid) {
            console.log(`💾 Saving customer_uid for future webhooks: ${customerUid}`);
            await supabase
              .from("users")
              .update({ customer_uid: customerUid })
              .eq("id", user.id);
          }
        }
      }
      
      // אפשרות 2: זיהוי לפי customer_uid (PayPlus)
      if (!user && customerUid) {
        console.log(`🔍 [2/3] Email not found, searching by customer_uid: ${customerUid}`);
        const result = await supabase
          .from("users")
          .select("id, full_name, email, plan_id, customer_uid")
          .eq("customer_uid", customerUid)
          .single();
        user = result.data;
        userError = result.error;
        
        if (user) {
          console.log(`✅ User found by customer_uid: ${user.full_name}`);
        }
      }
      
      // אפשרות 3: זיהוי לפי user_id מתוך more_info
      if (!user && userIdFromMoreInfo) {
        console.log(`🔍 [3/3] Searching by user_id from more_info: ${userIdFromMoreInfo}`);
        const result = await supabase
          .from("users")
          .select("id, full_name, email, plan_id, customer_uid")
          .eq("id", userIdFromMoreInfo)
          .single();
        user = result.data;
        userError = result.error;
        
        if (user) {
          console.log(`✅ User found by more_info user_id: ${user.full_name}`);
          
          // שמור את customer_uid לפעם הבאה
          if (customerUid && !user.customer_uid) {
            console.log(`💾 Saving customer_uid for future webhooks: ${customerUid}`);
            await supabase
              .from("users")
              .update({ customer_uid: customerUid })
              .eq("id", user.id);
          }
        }
      }
      
      // אם לא מצאנו בכלל - שגיאה
      if (!user || userError) {
        console.error(`❌ User not found by any method:`);
        console.error(`   - customer_email: ${customerEmail || 'N/A'}`);
        console.error(`   - customer_uid: ${customerUid || 'N/A'}`);
        console.error(`   - user_id (more_info): ${userIdFromMoreInfo || 'N/A'}`);
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }
      
      console.log(`✅ User identified: ${user.full_name} (${user.email})`);
      
      // בדוק אם למשתמש כבר יש subscription פעיל
      const { data: existingSubscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();
      
      if (existingSubscription) {
        console.log(`📋 User already has active subscription: ${existingSubscription.id}`);
        subscription = existingSubscription;
      } else {
        // צור subscription חדש אוטומטית!
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        
        // השתמש ב-plan_id של המשתמש
        const userPlanId = user.plan_id || null;
        
        console.log(`📋 User's plan_id: ${userPlanId || 'none'}`);
        
        const { data: newSubscription, error: createError } = await supabase
          .from("subscriptions")
          .insert({
            user_id: user.id,
            plan_id: userPlanId,
            status: 'active',
            billing_cycle: 'monthly',
            amount: webhookData.amount,
            currency: 'ILS',
            payment_provider: 'payplus',
            provider_customer_id: customerUid,
            provider_subscription_id: recurringUid,
            next_billing_date: nextBillingDate.toISOString().split('T')[0],
            started_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (createError || !newSubscription) {
          console.error("❌ Failed to create subscription:", createError);
          return NextResponse.json(
            { success: false, error: "Failed to create subscription" },
            { status: 500 }
          );
        }
        
        subscription = newSubscription;
        console.log(`🎉 Created new subscription automatically: ${subscription.id}`);
        console.log(`   User: ${user.full_name}`);
        console.log(`   Amount: ${webhookData.amount} ILS/month`);
      }
    } else {
      console.log("📋 Found existing subscription:", subscription.id);
    }

    // שלב 4: שמור את החיוב בטבלת subscription_charges
    // בדיקה גם לפי status_code (000 = הצלחה)
    const chargeStatus = (webhookData.status === 'completed' || payload.status_code === '000') ? 'success' : 'failed';
    
    const { data: charge, error: chargeError } = await supabase
      .from("subscription_charges")
      .insert({
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        amount: webhookData.amount,
        currency: subscription.currency || 'ILS',
        status: chargeStatus,
        transaction_id: webhookData.transactionId,
        recurring_uid: recurringUid,
        payment_method: subscription.payment_method || 'credit_card',
        error_code: webhookData.status !== 'completed' ? payload.status_code : null,
        error_message: webhookData.status !== 'completed' ? payload.status_description : null,
        charged_at: new Date(webhookData.paymentDate),
        metadata: payload,
      })
      .select()
      .single();

    if (chargeError) {
      console.error("❌ Error saving charge:", chargeError);
      return NextResponse.json(
        { success: false, error: "Failed to save charge" },
        { status: 500 }
      );
    }

    console.log(`💰 Charge recorded: ${charge.id} (${chargeStatus})`);

    // שלב 5: עדכן את המנוי בהתאם לתוצאה
    if (chargeStatus === 'success') {
      // חיוב הצליח - עדכן תאריכים ואפס כשלונות
      const nextPaymentDate = new Date();
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + (subscription.billing_cycle === 'monthly' ? 1 : 12));

      await supabase
        .from("subscriptions")
        .update({
          last_payment_date: new Date(webhookData.paymentDate),
          next_payment_date: nextPaymentDate,
          payment_failures: 0,
          status: 'active', // ודא שהסטטוס פעיל
        })
        .eq("id", subscription.id);

      console.log("✅ Subscription updated - payment successful");
      console.log(`📅 Next payment date: ${nextPaymentDate.toISOString()}`);

      // שלב 6: יצירת חשבונית אוטומטית לחיוב המנוי
      try {
        // שלוף פרטי משתמש
        const { data: user } = await supabase
          .from("users")
          .select("id, full_name, email, phone")
          .eq("id", subscription.user_id)
          .single();

        if (user) {
          // יצירת מספר חשבונית
          const { data: invoiceNumber } = await supabase.rpc("generate_invoice_number");

          // יצירת חשבונית
          const { data: invoice, error: invoiceError } = await supabase
            .from("invoices")
            .insert({
              user_id: user.id,
              invoice_number: invoiceNumber || `INV-${Date.now()}`,
              status: "paid",
              total_amount: webhookData.amount,
              currency: subscription.currency || "ILS",
              paid_at: new Date(webhookData.paymentDate),
              notes: `חיוב חודשי אוטומטי - מנוי Clearpoint Security (Charge: ${charge.id}, Transaction: ${webhookData.transactionId})`,
              has_subscription: true,
            })
            .select()
            .single();

          if (!invoiceError && invoice) {
            // הוספת פריט לחשבונית
            await supabase
              .from("invoice_items")
              .insert({
                invoice_id: invoice.id,
                item_type: "subscription",
                item_name: "מנוי חודשי Clearpoint Security",
                item_description: `תקופה: ${new Date(webhookData.paymentDate).toLocaleDateString("he-IL")} - ${nextPaymentDate.toLocaleDateString("he-IL")}`,
                quantity: 1,
                unit_price: webhookData.amount,
                total_price: webhookData.amount,
                sort_order: 0,
              });

            // יצירת רשומת תשלום
            await supabase
              .from("payments")
              .insert({
                user_id: user.id,
                payment_provider: "payplus",
                payment_type: "recurring",
                amount: webhookData.amount.toString(),
                currency: subscription.currency || "ILS",
                status: "completed",
                description: "חיוב חודשי אוטומטי",
                invoice_id: invoice.id,
                provider_transaction_id: webhookData.transactionId,
                paid_at: new Date(webhookData.paymentDate),
                metadata: {
                  charge_id: charge.id,
                  subscription_id: subscription.id,
                  auto_generated: true,
                },
              });

            // עדכן את החשבונית עם payment_id
            await supabase
              .from("invoices")
              .update({
                payment_id: invoice.id,
              })
              .eq("id", invoice.id);

            console.log(`📄 Invoice created automatically: ${invoice.invoice_number}`);

            // שלח מייל ללקוח עם קישור לחשבונית
            const invoiceUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${invoice.id}`;
            
            // שליחת מייל עם החשבונית
            const emailResult = await sendInvoiceEmail({
              to: user.email,
              userName: user.full_name || user.email,
              invoiceNumber: invoice.invoice_number,
              amount: webhookData.amount,
              invoiceUrl: invoiceUrl,
              paymentDate: new Date(webhookData.paymentDate).toLocaleDateString("he-IL"),
              nextPaymentDate: nextPaymentDate.toLocaleDateString("he-IL"),
            });
            
            if (emailResult.success) {
              console.log(`📧 Invoice email sent successfully to ${user.email}`);
            } else {
              console.error(`❌ Failed to send invoice email: ${emailResult.error}`);
            }
          } else {
            console.error("❌ Failed to create invoice:", invoiceError);
          }
        }
      } catch (invoiceCreationError) {
        console.error("❌ Error creating invoice:", invoiceCreationError);
        // לא נכשיל את כל ה-webhook אם יצירת החשבונית נכשלה
      }

    } else {
      // חיוב נכשל - הגדל payment_failures
      const newFailures = (subscription.payment_failures || 0) + 1;
      
      await supabase
        .from("subscriptions")
        .update({
          payment_failures: newFailures,
          // אם הגענו ל-3 כשלונות, השעה את המנוי
          status: newFailures >= 3 ? 'suspended' : subscription.status,
        })
        .eq("id", subscription.id);

      console.log(`⚠️ Payment failed - failures: ${newFailures}`);
      
      if (newFailures >= 3) {
        console.log("🚫 Subscription suspended due to multiple failures");
        // שלח אימייל ללקוח על השעיית המנוי
        // await sendPaymentFailureEmail(subscription.user_id, newFailures);
      }
    }

    // שלב 6: החזר תשובה ל-PayPlus
    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      chargeId: charge.id,
      status: chargeStatus,
    });

  } catch (error) {
    console.error("❌ Error processing PayPlus recurring webhook:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint לבדיקה
export async function GET() {
  return NextResponse.json({
    message: "PayPlus recurring webhook endpoint",
    method: "POST only",
    status: "active",
  });
}
