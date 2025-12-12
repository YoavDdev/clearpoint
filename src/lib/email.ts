/**
 * Email Notifications System using Resend
 * https://resend.com/docs/send-with-nextjs
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'alerts@clearpoint.co.il';

// =====================================================
// Types
// =====================================================

export interface PaymentConfirmationData {
  customerName: string;
  customerEmail: string;
  amount: number;
  paymentDate: string;
  invoiceNumber?: string;
  transactionId: string;
  nextBillingDate?: string; // אם יש מנוי
  monthlyAmount?: number; // מחיר חודשי
}

export interface PaymentFailedData {
  customerName: string;
  customerEmail: string;
  amount: number;
  failureReason: string;
  retryDate?: string;
  paymentLink?: string;
}

export interface UpcomingChargeData {
  customerName: string;
  customerEmail: string;
  amount: number;
  chargeDate: string;
  subscriptionDetails: string;
}

export interface CancellationConfirmationData {
  customerName: string;
  customerEmail: string;
  cancellationDate: string;
  endOfServiceDate: string;
  cancellationReason?: string;
}

// =====================================================
// Email Templates
// =====================================================

function paymentConfirmationTemplate(data: PaymentConfirmationData): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>אישור תשלום</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #10b981; margin: 0;">✅ התשלום בוצע בהצלחה!</h1>
    </div>
    
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 14px;">שלום ${data.customerName},</p>
      <p style="margin: 10px 0 0 0; font-size: 16px;">התשלום שלך התקבל ועובד בהצלחה! 🎉</p>
    </div>

    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="margin-top: 0; color: #1f2937;">פרטי התשלום:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">סכום:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: left; font-weight: bold; font-size: 20px; color: #10b981;">₪${data.amount.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">תאריך:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: left;">${data.paymentDate}</td>
        </tr>
        ${data.invoiceNumber ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">מספר חשבונית:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: left;">${data.invoiceNumber}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 10px 0;">מזהה עסקה:</td>
          <td style="padding: 10px 0; text-align: left; font-family: monospace; font-size: 12px;">${data.transactionId}</td>
        </tr>
      </table>
    </div>

    ${data.nextBillingDate && data.monthlyAmount ? `
    <div style="background-color: #dbeafe; border-right: 4px solid #3b82f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h4 style="margin-top: 0; color: #1e40af;">🔄 מנוי חודשי פעיל</h4>
      <p style="margin: 5px 0; color: #1e3a8a;">החיוב הבא: ${data.nextBillingDate}</p>
      <p style="margin: 5px 0; color: #1e3a8a;">סכום חודשי: ₪${data.monthlyAmount.toLocaleString()}</p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #475569;">החיוב יתבצע אוטומטית מכרטיס האשראי שלך</p>
    </div>
    ` : ''}

    <div style="background-color: #fef3c7; border-right: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; color: #78350f; font-size: 14px;">
        💡 <strong>טיפ:</strong> שמור מייל זה לצורך תיעוד ומעקב אחר התשלומים שלך
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
        צפה בדשבורד שלי
      </a>
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #6b7280;">Clearpoint Security Systems</p>
      <p style="margin: 5px 0; font-size: 12px; color: #6b7280;">טלפון: 050-123-4567 | אימייל: info@clearpoint.co.il</p>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #9ca3af;">
        קיבלת מייל זה כי ביצעת תשלום במערכת Clearpoint Security
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function paymentFailedTemplate(data: PaymentFailedData): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>תשלום נכשל</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #ef4444; margin: 0;">❌ התשלום לא עבר</h1>
    </div>
    
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 14px;">שלום ${data.customerName},</p>
      <p style="margin: 10px 0 0 0; font-size: 16px;">מצטערים, אבל התשלום שלך לא עבר.</p>
    </div>

    <div style="background-color: #fef2f2; border-right: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="margin-top: 0; color: #991b1b;">סיבה לכישלון:</h3>
      <p style="margin: 0; color: #7f1d1d; font-weight: bold;">${data.failureReason}</p>
    </div>

    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="margin-top: 0; color: #1f2937;">פרטי התשלום שנכשל:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">סכום:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: left; font-weight: bold; font-size: 20px;">₪${data.amount.toLocaleString()}</td>
        </tr>
        ${data.retryDate ? `
        <tr>
          <td style="padding: 10px 0;">נסיון חוזר:</td>
          <td style="padding: 10px 0; text-align: left;">${data.retryDate}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="background-color: #dbeafe; border-right: 4px solid #3b82f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h4 style="margin-top: 0; color: #1e40af;">💡 מה לעשות עכשיו?</h4>
      <ul style="margin: 0; padding-right: 20px; color: #1e3a8a;">
        <li>בדוק את פרטי כרטיס האשראי שלך</li>
        <li>ודא שיש יתרה מספקת</li>
        <li>צור קשר עם הבנק לבירור</li>
        <li>נסה שוב באמצעות הכפתור למטה</li>
      </ul>
    </div>

    ${data.paymentLink ? `
    <div style="text-align: center; margin-top: 30px;">
      <a href="${data.paymentLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
        🔄 נסה לשלם שוב
      </a>
    </div>
    ` : ''}

    <div style="background-color: #fef3c7; border-right: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 20px;">
      <p style="margin: 0; color: #78350f; font-size: 14px;">
        ⚠️ <strong>חשוב:</strong> ללא תשלום, השירות עלול להיות מושבת. אנא טפל בנושא בהקדם.
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 14px; color: #1f2937;">שאלות? <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/support" style="color: #3b82f6;">צור קשר עם התמיכה</a></p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">Clearpoint Security Systems | 050-123-4567</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function upcomingChargeTemplate(data: UpcomingChargeData): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>תזכורת: חיוב מתקרב</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #3b82f6; margin: 0;">🔔 תזכורת: חיוב מתקרב</h1>
    </div>
    
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 14px;">שלום ${data.customerName},</p>
      <p style="margin: 10px 0 0 0; font-size: 16px;">זו תזכורת ידידותית שהחיוב החודשי שלך מתקרב</p>
    </div>

    <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="margin-top: 0; color: #1e40af;">פרטי החיוב הבא:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #bfdbfe;">תאריך:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #bfdbfe; text-align: left; font-weight: bold;">${data.chargeDate}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #bfdbfe;">סכום:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #bfdbfe; text-align: left; font-weight: bold; font-size: 20px; color: #1e40af;">₪${data.amount.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;">תוכנית:</td>
          <td style="padding: 10px 0; text-align: left;">${data.subscriptionDetails}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #f0fdf4; border-right: 4px solid #10b981; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; color: #064e3b; font-size: 14px;">
        ✅ <strong>החיוב יתבצע אוטומטית</strong> מכרטיס האשראי שלך. אין צורך בפעולה מצדך.
      </p>
    </div>

    <div style="background-color: #fef3c7; border-right: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h4 style="margin-top: 0; color: #78350f;">💡 טיפ:</h4>
      <p style="margin: 5px 0 0 0; color: #78350f; font-size: 14px;">
        ודא שיש יתרה מספקת בכרטיס כדי למנוע הפסקת שירות
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/subscription" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
        צפה בפרטי המנוי
      </a>
    </div>

    <div style="text-align: center; margin-top: 20px;">
      <p style="margin: 0; font-size: 13px; color: #6b7280;">
        רוצה לבטל? <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/subscription" style="color: #ef4444;">ניתן לבטל בכל עת</a>
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #6b7280;">Clearpoint Security Systems</p>
      <p style="margin: 5px 0; font-size: 12px; color: #6b7280;">טלפון: 050-123-4567 | אימייל: info@clearpoint.co.il</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function cancellationConfirmationTemplate(data: CancellationConfirmationData): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>אישור ביטול מנוי</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #6b7280; margin: 0;">😢 אישור ביטול מנוי</h1>
    </div>
    
    <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 14px;">שלום ${data.customerName},</p>
      <p style="margin: 10px 0 0 0; font-size: 16px;">המנוי שלך בוטל כפי שביקשת</p>
    </div>

    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="margin-top: 0; color: #1f2937;">פרטי הביטול:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">תאריך ביטול:</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: left; font-weight: bold;">${data.cancellationDate}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;">תום שירות:</td>
          <td style="padding: 10px 0; text-align: left; font-weight: bold; color: #ef4444;">${data.endOfServiceDate}</td>
        </tr>
      </table>
    </div>

    ${data.cancellationReason ? `
    <div style="background-color: #fef3c7; border-right: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h4 style="margin-top: 0; color: #78350f;">הסיבה שנתת:</h4>
      <p style="margin: 0; color: #78350f; font-style: italic;">"${data.cancellationReason}"</p>
    </div>
    ` : ''}

    <div style="background-color: #dbeafe; border-right: 4px solid #3b82f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h4 style="margin-top: 0; color: #1e40af;">💡 חשוב לדעת:</h4>
      <ul style="margin: 5px 0 0 0; padding-right: 20px; color: #1e3a8a;">
        <li>המנוי יישאר פעיל עד ${data.endOfServiceDate}</li>
        <li>לא יבוצעו חיובים נוספים</li>
        <li>הגישה למערכת תיחסם בתום התקופה</li>
        <li>ההקלטות שלך יימחקו לאחר 30 יום</li>
      </ul>
    </div>

    <div style="background-color: #fef2f2; border-right: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; color: #7f1d1d; font-size: 14px;">
        <strong>שימו לב:</strong> לאחר תום התקופה, השירות יושבת והמצלמות לא יוכלו לשמור הקלטות חדשות.
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <h3 style="color: #1f2937;">התחרטת? 🤔</h3>
      <p style="color: #6b7280;">אפשר לחדש את המנוי בכל עת</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/subscribe" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">
        חדש מנוי
      </a>
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 13px; color: #1f2937;">נשמח לשמוע את המשוב שלך!</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/support" style="color: #3b82f6; font-size: 13px;">שלח לנו משוב →</a>
      <p style="margin: 15px 0 0 0; font-size: 12px; color: #6b7280;">Clearpoint Security Systems | 050-123-4567</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// =====================================================
// Send Functions
// =====================================================

export async function sendPaymentConfirmation(data: PaymentConfirmationData): Promise<boolean> {
  try {
    console.log('📧 Sending payment confirmation email to:', data.customerEmail);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `✅ אישור תשלום - ₪${data.amount.toLocaleString()} | Clearpoint Security`,
      html: paymentConfirmationTemplate(data),
    });

    console.log('✅ Payment confirmation email sent:', result);
    return true;
  } catch (error) {
    console.error('❌ Failed to send payment confirmation:', error);
    return false;
  }
}

export async function sendPaymentFailed(data: PaymentFailedData): Promise<boolean> {
  try {
    console.log('📧 Sending payment failed email to:', data.customerEmail);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `❌ תשלום נכשל - ₪${data.amount.toLocaleString()} | Clearpoint Security`,
      html: paymentFailedTemplate(data),
    });

    console.log('✅ Payment failed email sent:', result);
    return true;
  } catch (error) {
    console.error('❌ Failed to send payment failed email:', error);
    return false;
  }
}

export async function sendUpcomingCharge(data: UpcomingChargeData): Promise<boolean> {
  try {
    console.log('📧 Sending upcoming charge reminder to:', data.customerEmail);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `🔔 תזכורת: חיוב של ₪${data.amount.toLocaleString()} מתקרב | Clearpoint Security`,
      html: upcomingChargeTemplate(data),
    });

    console.log('✅ Upcoming charge email sent:', result);
    return true;
  } catch (error) {
    console.error('❌ Failed to send upcoming charge email:', error);
    return false;
  }
}

export async function sendCancellationConfirmation(data: CancellationConfirmationData): Promise<boolean> {
  try {
    console.log('📧 Sending cancellation confirmation to:', data.customerEmail);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: '😢 אישור ביטול מנוי | Clearpoint Security',
      html: cancellationConfirmationTemplate(data),
    });

    console.log('✅ Cancellation confirmation email sent:', result);
    return true;
  } catch (error) {
    console.error('❌ Failed to send cancellation confirmation:', error);
    return false;
  }
}
