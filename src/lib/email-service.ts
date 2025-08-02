import { Resend } from 'resend';

// Initialize Resend with API key and EU region
const resend = new Resend(process.env.RESEND_API_KEY);

// Note: If domain issues persist, the API key might need to be regenerated
// after domain verification, or there might be a region mismatch

export interface AlertEmailData {
  to: string;
  userName: string;
  cameraName: string;
  alertType: string;
  alertMessage: string;
  alertAge: number;
  alertId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export async function sendAlertEmail(emailData: AlertEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📧 [EMAIL] Sending real email notification to: ${emailData.to}`);
    
    // Get severity emoji and color
    const getSeverityInfo = (severity: string) => {
      switch (severity) {
        case 'critical': return { emoji: '🚨', color: '#dc2626', level: 'קריטי' };
        case 'high': return { emoji: '⚠️', color: '#ea580c', level: 'גבוה' };
        case 'medium': return { emoji: '⚡', color: '#d97706', level: 'בינוני' };
        default: return { emoji: '💡', color: '#2563eb', level: 'נמוך' };
      }
    };
    
    const severityInfo = getSeverityInfo(emailData.severity);
    
    // Create professional Hebrew email template
    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>התראת אבטחה - Clearpoint Security</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; border-bottom: 3px solid ${severityInfo.color}; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: ${severityInfo.color}; margin: 0; font-size: 28px;">
              ${severityInfo.emoji} התראת אבטחה
            </h1>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 16px;">Clearpoint Security System</p>
          </div>
          
          <!-- Alert Details -->
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #333; margin-top: 0; font-size: 20px;">פרטי ההתראה</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555; width: 30%;">מצלמה:</td>
                <td style="padding: 8px 0; color: #333;">${emailData.cameraName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">סוג התראה:</td>
                <td style="padding: 8px 0; color: #333;">${emailData.alertType === 'stream_error' ? 'שגיאת זרם' : emailData.alertType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">רמת חומרה:</td>
                <td style="padding: 8px 0; color: ${severityInfo.color}; font-weight: bold;">${severityInfo.level}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">זמן התראה:</td>
                <td style="padding: 8px 0; color: #333;">${emailData.alertAge} דקות</td>
              </tr>
            </table>
          </div>
          
          <!-- Alert Message -->
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #856404; margin-top: 0; font-size: 16px;">הודעת התראה:</h3>
            <p style="color: #856404; margin: 0; font-size: 14px; font-weight: 500;">${emailData.alertMessage}</p>
          </div>
          
          <!-- Action Required -->
          <div style="background: #e3f2fd; border: 1px solid #90caf9; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1565c0; margin-top: 0; font-size: 16px;">פעולה נדרשת:</h3>
            <ul style="color: #1565c0; margin: 0; padding-right: 20px;">
              <li>בדוק את חיבור המצלמה לרשת</li>
              <li>ודא שהמצלמה מקבלת חשמל</li>
              <li>בדוק את הגדרות הרשת והנתב</li>
              <li>אם הבעיה נמשכת, פנה לתמיכה טכנית</li>
            </ul>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              התראה זו נשלחה אוטומטית על ידי מערכת Clearpoint Security
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
              Alert ID: ${emailData.alertId}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Send email using Resend
    const result = await resend.emails.send({
      from: 'Clearpoint Security <alerts@clearpoint.co.il>',
      to: [emailData.to],
      subject: `${severityInfo.emoji} התראת אבטחה: ${emailData.cameraName} - ${severityInfo.level}`,
      html: emailHtml,
      text: `
התראת אבטחה - Clearpoint Security

מצלמה: ${emailData.cameraName}
סוג התראה: ${emailData.alertType === 'stream_error' ? 'שגיאת זרם' : emailData.alertType}
רמת חומרה: ${severityInfo.level}
זמן התראה: ${emailData.alertAge} דקות

הודעה: ${emailData.alertMessage}

פעולה נדרשת:
- בדוק את חיבור המצלמה לרשת
- ודא שהמצלמה מקבלת חשמל
- בדוק את הגדרות הרשת והנתב

Alert ID: ${emailData.alertId}
      `.trim()
    });
    
    if (result.error) {
      console.error('❌ [EMAIL] Failed to send email:', result.error);
      return { success: false, error: result.error.message };
    }
    
    console.log(`✅ [EMAIL] Email sent successfully! ID: ${result.data?.id}`);
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ [EMAIL] Error sending email:', error);
    return { success: false, error: error.message || 'Unknown email error' };
  }
}
