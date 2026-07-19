import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import { apiHandler } from "@/lib/api-handler";

export const dynamic = 'force-dynamic';

/**
 * שליחת קישור הזמנה מחדש ללקוח
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // שליפת פרטי הלקוח
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://clearpoint.co.il";

  // וידוא שהמייל מאומת (נדרש ל-magiclink)
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });

  // יצירת לינק כניסה חדש
  const result = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
    options: { redirectTo: `${siteUrl}/auth/callback?next=/setup-password` },
  });

  console.log("📧 generateLink result:", { error: result.error, hasLink: !!result.data?.properties?.action_link });

  if (result.error || !result.data?.properties?.action_link) {
    return NextResponse.json(
      { success: false, error: result.error?.message || "Failed to generate link" },
      { status: 500 }
    );
  }

  // שליחת מייל חדש
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: process.env.RESEND_AUTH_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "Clearpoint <no-reply@clearpoint.co.il>",
      to: [user.email],
      subject: "ClearPoint - קישור כניסה חדש",
      html: `
        <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">ClearPoint</h1>
            <p style="color: #bfdbfe; font-size: 14px; margin: 8px 0 0 0;">מערכות אבטחה ומצלמות</p>
          </div>

          <!-- Body -->
          <div style="padding: 40px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1f2937; font-size: 22px; font-weight: 600; margin: 0 0 16px 0;">שלום ${user.full_name || ""},</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 12px 0;">
              הנה קישור חדש לכניסה למערכת ClearPoint.
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 28px 0;">
              לחץ/י על הכפתור למטה להגדרת סיסמה וכניסה:
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${result.data.properties.action_link}" target="_blank" 
                style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 700; padding: 16px 48px; border-radius: 8px; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);">
                כניסה למערכת
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 24px 0 0 0;">
              הקישור תקף לזמן מוגבל. אם פג התוקף, פנה למשרד לקבלת קישור חדש.
            </p>

            <!-- Divider -->
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
              אם לא ביקשת קישור זה, ניתן להתעלם מהודעה זו.
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">ClearPoint Security &copy; ${new Date().getFullYear()}</p>
            <p style="margin: 4px 0 0 0;">info@clearpoint.co.il | www.clearpoint.co.il</p>
          </div>
        </div>
      `,
    });
  } catch (sendError: any) {
    console.error("❌ Failed to resend invite email:", sendError);
    return NextResponse.json({ success: false, error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Invite resent successfully" });
});
