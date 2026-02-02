import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createOneTimePayment } from "@/lib/payplus";
import { getIssuerSnapshot } from "@/lib/issuer";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { 
      userId, 
      items, 
      notes, 
      customerName, 
      customerEmail,
      customerPhone,
      customerAddress,
      customerCity,
      customerIdNumber,
      billingCustomerType,
      billingCompanyName,
      billingVatNumber,
      billingBusinessCity,
      billingBusinessPostalCode,
      billingCommunicationEmail,
      documentType = 'invoice',
      validUntil,
    } = await req.json();

    if (!userId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // חישוב סכום כולל (ציוד + התקנה)
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + (item.total_price || 0),
      0
    );

    const isQuote = documentType === 'quote';

    // Persist billing defaults on user (admin-managed)
    // This is best-effort; even if it fails we still create the document.
    try {
      await supabase
        .from('users')
        .update({
          customer_type: billingCustomerType || null,
          company_name: billingCompanyName || null,
          vat_number: billingVatNumber || null,
          business_city: billingBusinessCity || null,
          business_postal_code: billingBusinessPostalCode || null,
          communication_email: billingCommunicationEmail || null,
        })
        .eq('id', userId);
    } catch (e) {
      console.warn('⚠️ Failed to persist billing defaults on user (continuing):', e);
    }

    const billingSnapshot = {
      customer_type: billingCustomerType || null,
      company_name: billingCompanyName || null,
      vat_number: billingVatNumber || null,
      business_city: billingBusinessCity || customerCity || null,
      business_postal_code: billingBusinessPostalCode || null,
      communication_email: billingCommunicationEmail || null,
      customer_name: customerName || null,
      customer_email: customerEmail || null,
      customer_phone: customerPhone || null,
      customer_address: customerAddress || null,
    };

    const issuerSnapshot = {
      ...getIssuerSnapshot('ILS'),
    };

    // Annual atomic document number (YYYY-####)
    let invoiceNumber: string | null = null;

    // יצירת חשבונית עם retry logic למקרה של race condition
    let invoice = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (!invoice && attempts < maxAttempts) {
      attempts++;

      const numberFunction = isQuote
        ? "generate_quote_number"
        : "generate_invoice_number";

      const { data: generatedNumber, error: numberError } = await supabase.rpc(
        numberFunction
      );

      if (numberError || !generatedNumber) {
        console.error("Error generating invoice number:", numberError);
        return NextResponse.json(
          { success: false, error: "Failed to generate invoice number" },
          { status: 500 }
        );
      }

      invoiceNumber = generatedNumber as string;

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          user_id: userId,
          invoice_number: invoiceNumber,
          document_type: documentType,
          status: isQuote ? "quote_draft" : "draft",
          total_amount: totalAmount,
          currency: "ILS",
          notes: notes || null,
          quote_valid_until: isQuote && validUntil ? validUntil : null,
          billing_snapshot: billingSnapshot,
          issuer_snapshot: issuerSnapshot,
        })
        .select()
        .single();

      if (!error) {
        invoice = data;
        break;
      }

      // אם זו שגיאת duplicate - נסה עם מספר הבא
      if (error.code === '23505') {
        console.log(
          `Invoice number ${invoiceNumber} already exists, retrying generation...`
        );
        continue;
      }

      // שגיאה אחרת - עצור
      console.error("Error creating invoice:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create invoice" },
        { status: 500 }
      );
    }

    const invoiceError = !invoice;

    if (invoiceError || !invoice) {
      console.error("Error creating invoice:", invoiceError);
      return NextResponse.json(
        { success: false, error: "Failed to create invoice" },
        { status: 500 }
      );
    }

    // הוספת פריטים לחשבונית
    const invoiceItems = items.map((item: any, index: number) => ({
      invoice_id: invoice.id,
      item_type: item.item_type,
      item_name: item.item_name,
      item_description: item.item_description || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      camera_type: item.camera_type || null,
      sort_order: index,
    }));

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(invoiceItems);

    if (itemsError) {
      console.error("Error creating invoice items:", itemsError);
      // מחיקת החשבונית אם נכשלה הוספת הפריטים
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json(
        { success: false, error: "Failed to create invoice items" },
        { status: 500 }
      );
    }

    // אם זו הצעת מחיר - עדכון סטטוס ל-quote_sent וזהו
    if (isQuote) {
      await supabase
        .from("invoices")
        .update({
          status: "quote_sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      // תמיד להשתמש בדומיין הייצור ללינקים ללקוחות
      const quoteUrl = `https://www.clearpoint.co.il/quote/${invoice.id}`;

      return NextResponse.json({
        success: true,
        quote: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          total_amount: totalAmount,
          valid_until: validUntil,
        },
        quoteUrl: quoteUrl,
      });
    }

    // שליפת customer_uid של המשתמש (אם קיים)
    const { data: userData } = await supabase
      .from("users")
      .select("customer_uid")
      .eq("id", userId)
      .single();

    const customerUid = userData?.customer_uid || null;

    // אם זו חשבונית - יצירת רשומת תשלום ולינק PayPlus
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        payment_provider: "payplus",
        payment_type: "one_time",
        amount: totalAmount.toString(),
        currency: "ILS",
        status: "pending",
        description: `חשבונית #${invoice.invoice_number}`,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        items: items.map((item: any) => ({
          name: item.item_name,
          quantity: item.quantity,
          price: item.unit_price,
          description: item.item_description,
        })),
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
        },
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error("Error creating payment:", paymentError);
      return NextResponse.json(
        { success: false, error: "Failed to create payment record" },
        { status: 500 }
      );
    }

    // יצירת לינק תשלום דרך PayPlus
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invoice-payment-success?invoice_id=${invoice.id}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled`;

    const payplusResponse = await createOneTimePayment({
      sum: totalAmount,
      description: `קבלה התקנה #${invoice.invoice_number} - ${customerName}`,
      customer_uid: customerUid || undefined, // ✅ שימוש בלקוח קיים אם יש
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone || "",
      customer_address: customerAddress || "",
      customer_city: customerCity || "",
      customer_id_number: customerIdNumber || billingVatNumber || "",
      items: items.map((item: any) => ({
        name: item.item_name,
        quantity: item.quantity,
        price: item.unit_price,
        description: item.item_description || "",
      })),
      success_url: returnUrl,
      cancel_url: cancelUrl,
      custom_fields: {
        cField1: payment.id, // שמירת payment_id ל-webhook
      },
    });

    if (payplusResponse.status !== "1" || !payplusResponse.data) {
      console.error("PayPlus payment creation failed:", payplusResponse);
      return NextResponse.json(
        { success: false, error: "Failed to create payment link", details: payplusResponse.err },
        { status: 500 }
      );
    }

    // עדכון רשומת התשלום עם פרטי PayPlus
    await supabase
      .from("payments")
      .update({
        provider_transaction_id: payplusResponse.data.processId,
        provider_payment_url: payplusResponse.data.pageUrl,
      })
      .eq("id", payment.id);

    // עדכון החשבונית עם פרטי התשלום
    await supabase
      .from("invoices")
      .update({
        payment_id: payment.id,
        payment_link: payplusResponse.data.pageUrl,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    // הוסר: יצירת מנוי חודשי - מטופל בנפרד דרך SubscriptionManager

    // לינק לדף החשבונית שלנו (לא ישר ל-PayPlus)
    // תמיד להשתמש ב-domain הראשי בפרודקשן
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.clearpoint.co.il' 
      : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
    const invoiceUrl = `${baseUrl}/invoice/${invoice.id}`;

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: totalAmount,
      },
      payment: {
        id: payment.id,
        amount: totalAmount,
        paymentUrl: payplusResponse.data.pageUrl,
        processId: payplusResponse.data.processId,
      },
      invoiceUrl: invoiceUrl, // לינק לחשבונית שלנו
      paymentUrl: payplusResponse.data.pageUrl, // לינק ל-PayPlus (לשימוש פנימי)
    });
  } catch (error) {
    console.error("Error in create-invoice:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
