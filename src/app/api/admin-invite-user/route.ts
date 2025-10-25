import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
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
    plan_type,             // → becomes plan_id in table
    plan_duration_days,
    custom_price,
    tunnel_name            // ✅ ADDED HERE
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

  // 2. Add to users table (now includes tunnel_name)
  const { error: dbError } = await supabaseAdmin.from("users").insert({
    id: userId,
    email,
    full_name,
    phone,
    address,
    notes,
    plan_id: plan_type,
    plan_duration_days,
    custom_price: custom_price ?? null,
    tunnel_name: tunnel_name || null,  // ✅ ADDED HERE
    subscription_status: "active",
  });

  if (dbError) {
    return NextResponse.json({ success: false, error: dbError.message }, { status: 400 });
  }

  // 3. Generate invite link
  const result = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/setup-password`,
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
