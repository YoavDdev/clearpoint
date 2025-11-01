import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { customerId, subject, message } = await request.json();

    if (!customerId || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get customer info
    const { data: customer, error: customerError } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Send email using Resend
    const emailResult = await resend.emails.send({
      from: "Clearpoint Security <alerts@clearpoint.co.il>",
      to: customer.email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
              direction: rtl;
              background-color: #f8fafc;
              padding: 40px 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
              padding: 30px;
              text-align: center;
            }
            .logo {
              color: white;
              font-size: 28px;
              font-weight: bold;
              margin: 0;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #1e293b;
              margin-bottom: 20px;
            }
            .message {
              font-size: 16px;
              line-height: 1.6;
              color: #475569;
              white-space: pre-wrap;
              margin-bottom: 30px;
            }
            .footer {
              background-color: #f1f5f9;
              padding: 20px 30px;
              text-align: center;
              font-size: 14px;
              color: #64748b;
            }
            .signature {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e2e8f0;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">✓ Clearpoint Security</h1>
            </div>
            
            <div class="content">
              <div class="greeting">
                שלום ${customer.full_name},
              </div>
              
              <div class="message">${message}</div>
              
              <div class="signature">
                בברכה,<br>
                <strong>צוות Clearpoint Security</strong>
              </div>
            </div>
            
            <div class="footer">
              <p>© 2025 Clearpoint Security. כל הזכויות שמורות.</p>
              <p style="margin-top: 10px;">
                <a href="https://clearpoint.co.il" style="color: #3b82f6; text-decoration: none;">
                  clearpoint.co.il
                </a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    // Log the email in database (optional)
    await supabase.from("admin_emails_log").insert({
      customer_id: customerId,
      customer_email: customer.email,
      subject: subject,
      message: message,
      sent_at: new Date().toISOString(),
      resend_id: emailResult.data?.id,
    });

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      emailId: emailResult.data?.id,
    });
  } catch (error) {
    console.error("Error sending customer email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
