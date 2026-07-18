import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { listAllRecurringPayments } from "@/lib/payplus";
import { updatePayPlusCustomer, createPayPlusCustomer, removePayPlusCustomer } from "@/lib/payplus";
import { logAdminAction } from "@/lib/audit";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

// ─── GET /api/admin/users — List all users (enriched) ───────────────────────

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: users, error } = await supabase
    .from("users")
    .select(`
      id, email, full_name, plan_id, phone, address,
      customer_type, company_name, vat_number, business_city,
      business_postal_code, communication_email, notes,
      custom_price, plan_duration_days, needs_support,
      subscription_active, subscription_status, initial_camera_count,
      cameras (id)
    `)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const { data: requests } = await supabase
    .from("support_requests")
    .select("user_id")
    .eq("is_handled", false);

  const activeSupportUsers = new Set(requests?.map((r) => r.user_id));

  let subscriptionMap = new Map();
  try {
    const result = await listAllRecurringPayments();
    if (result.status === "success" && result.data) {
      result.data.forEach((payment: any) => {
        if (payment.customer_email && payment.status === "active") {
          subscriptionMap.set(payment.customer_email.toLowerCase(), {
            status: payment.status,
            amount: payment.amount,
            next_billing_date: payment.next_charge_date,
            last_billing_date: payment.last_charge_date || null,
            billing_cycle: payment.recurring_type || "monthly",
          });
        }
      });
    }
  } catch (error) {
    console.error("Failed to fetch PayPlus subscriptions:", error);
  }

  const { data: latestPayments } = await supabase
    .from("payments")
    .select("user_id, amount, status, paid_at, payment_type")
    .order("created_at", { ascending: false });

  const paymentMap = new Map();
  latestPayments?.forEach((payment) => {
    if (!paymentMap.has(payment.user_id)) {
      paymentMap.set(payment.user_id, payment);
    }
  });

  const enriched = users.map((user) => {
    const subscription = subscriptionMap.get(user.email?.toLowerCase());
    const latestPayment = paymentMap.get(user.id);

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      plan_id: user.plan_id,
      phone: user.phone,
      address: user.address,
      customer_type: (user as any).customer_type,
      company_name: (user as any).company_name,
      vat_number: (user as any).vat_number,
      business_city: (user as any).business_city,
      business_postal_code: (user as any).business_postal_code,
      communication_email: (user as any).communication_email,
      notes: user.notes,
      custom_price: user.custom_price,
      plan_duration_days: user.plan_duration_days,
      needs_support: user.needs_support,
      has_pending_support: activeSupportUsers.has(user.id),
      subscription_active: user.subscription_active,
      subscription_status: user.subscription_status,
      initial_camera_count: user.initial_camera_count ?? 4,
      camera_count: user.cameras?.length || 0,
      subscription: subscription ? {
        status: subscription.status,
        amount: subscription.amount,
        next_billing_date: subscription.next_billing_date,
        last_billing_date: subscription.last_billing_date,
        billing_cycle: subscription.billing_cycle,
      } : null,
      latest_payment: latestPayment ? {
        amount: latestPayment.amount,
        status: latestPayment.status,
        paid_at: latestPayment.paid_at,
        payment_type: latestPayment.payment_type,
      } : null,
    };
  });

  return NextResponse.json({ success: true, users: enriched });
}

// ─── POST /api/admin/users — Create & invite user ───────────────────────────

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.json();
  const {
    email, full_name, phone, address, notes, plan_id,
    plan_duration_days, custom_price, tunnel_name,
    vat_number, business_city, business_postal_code, communication_email,
  } = body;

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: false,
  });

  if (authError || !authUser?.user) {
    return NextResponse.json({ success: false, error: authError?.message }, { status: 400 });
  }

  const userId = authUser.user.id;

  const { error: dbError } = await supabaseAdmin.from("users").insert({
    id: userId,
    email,
    full_name,
    phone,
    address,
    notes,
    plan_id,
    plan_duration_days,
    custom_price: custom_price ?? null,
    tunnel_name: tunnel_name || null,
    subscription_status: "active",
    vat_number: vat_number || null,
    business_city: business_city || null,
    business_postal_code: business_postal_code || null,
    communication_email: communication_email || null,
    customer_uid: null,
  });

  if (dbError) {
    console.error("❌ DB insert error:", dbError);
    return NextResponse.json({ success: false, error: dbError.message }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://clearpoint.co.il";
  const result = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${siteUrl}/auth/callback?next=/setup-password` },
  });

  if (result.error || !result.data?.properties?.action_link) {
    return NextResponse.json({ success: false, error: result.error?.message || "Failed to generate link" }, { status: 500 });
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_AUTH_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "Clearpoint <no-reply@clearpoint.co.il>",
      to: [email],
      subject: "הצטרפות למערכת Clearpoint",
      html: `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h2>שלום ${full_name || ""},</h2>
          <p>נוצר עבורך חשבון במערכת Clearpoint.</p>
          <p>להגדרת סיסמה וכניסה ראשונה, לחץ/י על הקישור הבא:</p>
          <p><a href="${result.data.properties.action_link}" target="_blank">השלם הרשמה</a></p>
          <p>אם אינך מכיר/ה את המייל הזה, ניתן להתעלם ממנו.</p>
          <br />
          <p>תודה,</p>
          <p>צוות Clearpoint</p>
        </div>
      `,
    });
  } catch (sendError: any) {
    console.error("❌ Failed to send email:", sendError);
    return NextResponse.json({ success: false, error: "Email send failed" }, { status: 500 });
  }

  logAdminAction({
    admin_email: session.user.email!,
    action: "user.create",
    target_type: "user",
    target_id: userId,
    details: { email },
  });

  return NextResponse.json({ success: true });
}

// ─── PUT /api/admin/users — Edit user ───────────────────────────────────────

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: currentUser } = await supabase
    .from("users")
    .select("customer_uid, email")
    .eq("id", body.id)
    .single();

  const { error } = await supabase
    .from("users")
    .update({
      full_name: body.full_name,
      phone: body.phone,
      address: body.address,
      notes: body.notes,
      plan_id: body.plan_id,
      plan_duration_days: body.plan_duration_days,
      custom_price: body.custom_price ?? null,
      vat_number: body.vat_number ?? null,
      business_city: body.business_city ?? null,
      business_postal_code: body.business_postal_code ?? null,
      communication_email: body.communication_email ?? null,
    })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  if (currentUser?.customer_uid) {
    const payplusResult = await updatePayPlusCustomer(currentUser.customer_uid, {
      email: currentUser.email,
      customer_name: body.full_name || currentUser.email,
      phone: body.phone || "",
      business_address: body.address || "",
      business_city: body.business_city || "",
      business_postal_code: body.business_postal_code || "",
      notes: body.notes || "",
      customer_number: body.id,
      vat_number: body.vat_number || "",
      communication_email: body.communication_email || currentUser.email,
    });
    if (!payplusResult.success) {
      console.warn("⚠️ Failed to update PayPlus customer:", payplusResult.error);
    }
  } else if (currentUser?.email) {
    const payplusResult = await createPayPlusCustomer({
      email: currentUser.email,
      customer_name: body.full_name || currentUser.email,
      phone: body.phone || "",
      business_address: body.address || "",
      business_city: body.business_city || "",
      business_postal_code: body.business_postal_code || "",
      notes: body.notes || "",
      customer_number: body.id,
      vat_number: body.vat_number || "",
      communication_email: body.communication_email || currentUser.email,
    });
    if (payplusResult.success && payplusResult.customer_uid) {
      await supabase.from("users").update({ customer_uid: payplusResult.customer_uid }).eq("id", body.id);
    }
  }

  return NextResponse.json({ success: true });
}

// ─── DELETE /api/admin/users — Soft-delete user ─────────────────────────────

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ success: false, error: "Missing user ID" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: user, error: updateError } = await supabaseAdmin
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", userId)
    .select("customer_uid, email")
    .single();

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
  }

  await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: "876600h",
  });

  if (user?.customer_uid) {
    const payplusResult = await removePayPlusCustomer(user.customer_uid);
    if (!payplusResult.success) {
      console.warn("⚠️ Failed to remove PayPlus customer:", payplusResult.error);
    }
  }

  logAdminAction({
    admin_email: session.user.email!,
    action: "user.delete",
    target_type: "user",
    target_id: userId,
    details: { email: user?.email },
  });

  return NextResponse.json({ success: true });
}
