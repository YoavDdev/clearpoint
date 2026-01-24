import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createPayPlusCustomer } from "@/lib/payplus";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const {
    email,
    full_name,
    phone,
    address,
    notes,
    plan_id,
    plan_duration_days,
    custom_price,
    tunnel_name,
    // Business fields
    vat_number,
    business_city,
    business_postal_code,
    communication_email,
  } = body;

  // 1. Create user in Supabase Auth (no password yet)
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: false,
  });

  if (authError || !authUser?.user) {
    return NextResponse.json({ success: false, error: authError?.message }, { status: 400 });
  }

  const userId = authUser.user.id;

  // 2. לא יוצרים לקוח ב-PayPlus עדיין - רק במערכת שלנו
  // PayPlus יוצר לקוח אוטומטית בתשלום הראשון
  console.log('✅ Skipping PayPlus customer creation - will be created on first payment');
  
  const customer_uid = null; // יוגדר אוטומטית בתשלום הראשון

  // 3. Add to users table (customer_uid יהיה null בהתחלה)
  console.log('💾 Creating user in DB without customer_uid (will be set on first payment)');
  
  const { data: insertedUser, error: dbError } = await supabaseAdmin.from("users").insert({
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
    // Business fields
    vat_number: vat_number || null,
    business_city: business_city || null,
    business_postal_code: business_postal_code || null,
    communication_email: communication_email || null,
    customer_uid: customer_uid,
  }).select();

  if (dbError) {
    console.error('❌ DB insert error:', dbError);
    return NextResponse.json({ success: false, error: dbError.message }, { status: 400 });
  }

  console.log('✅ User inserted to DB:', insertedUser);
  console.log('🔍 Verify customer_uid in DB:', insertedUser?.[0]?.customer_uid);

  // 4. Generate invite link with proper callback flow
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://clearpoint.co.il';
  const result = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=/setup-password`,
    },
  });

  const invite = result.data;
  const linkError = result.error;

  if (linkError || !invite?.properties?.action_link) {
    return NextResponse.json({
      success: false,
      error: linkError?.message || "Failed to generate link",
    }, { status: 500 });
  }

  // 4. Send email via Resend
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Clearpoint <alerts@clearpoint.co.il>",
      to: [email], // Send to the actual new user
      subject: "הצטרפות למערכת Clearpoint",
      html: `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h2>שלום ${full_name || ""},</h2>
          <p>נוצר עבורך חשבון במערכת Clearpoint.</p>
          <p>להגדרת סיסמה וכניסה ראשונה, לחץ/י על הקישור הבא:</p>
          <p><a href="${invite.properties.action_link}" target="_blank">השלם הרשמה</a></p>
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

  return NextResponse.json({ success: true });
}
