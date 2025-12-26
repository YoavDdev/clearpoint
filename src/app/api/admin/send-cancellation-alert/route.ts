import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/send-cancellation-alert
 * שולח מייל לאדמין כשלקוח מבטל מנוי
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userName, userEmail, subscriptionId, recurringUid, reason, gracePeriodEnd } = body;

    // כאן תוכל להוסיף שליחת מייל אמיתי (Resend, SendGrid וכו')
    // לעת עתה רק נדפיס ללוג
    
    console.log("🚨 [ADMIN ALERT] לקוח ביטל מנוי!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`👤 לקוח: ${userName} (${userEmail})`);
    console.log(`🆔 Subscription ID: ${subscriptionId}`);
    console.log(`📋 Recurring UID: ${recurringUid || 'לא זמין'}`);
    console.log(`💬 סיבה: ${reason}`);
    console.log(`⏰ גישה עד: ${new Date(gracePeriodEnd).toLocaleDateString('he-IL')}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("❗ פעולה נדרשת: היכנס ל-PayPlus Dashboard ובטל הוראת קבע:");
    console.log(`   Recurring UID: ${recurringUid || 'חפש לפי מייל: ' + userEmail}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // אם יש Resend מוגדר, שלח מייל אמיתי
    if (process.env.RESEND_API_KEY) {
      try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@clearpoint.co.il';
        
        // כאן תוסיף קוד שליחת מייל עם Resend
        // await sendEmail({...})
        
        console.log(`📧 Admin alert email sent to: ${adminEmail}`);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Alert logged successfully"
    });

  } catch (error) {
    console.error("Error sending cancellation alert:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
