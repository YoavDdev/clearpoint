import { Resend } from 'resend';

// Initialize Resend with API key and EU region
const resend = new Resend(process.env.RESEND_API_KEY);

export interface InvoiceEmailData {
  to: string;
  userName: string;
  invoiceNumber: string;
  amount: number;
  invoiceUrl: string;
  paymentDate: string;
  nextPaymentDate?: string;
}

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

export interface CleanupReportData {
  to: string;
  totalFilesScanned: number;
  totalFilesDeleted: number;
  usersWithActiveSubscription: number;
  usersWithoutSubscription: number;
  deletedByCategory: {
    withSubscription: number;
    withoutSubscription: number;
    admin: number;
  };
  executionTimeSeconds: number;
  errors: number;
}

export async function sendCleanupReport(reportData: CleanupReportData): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📧 [EMAIL] Sending cleanup report to: ${reportData.to}`);
    
    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>דוח ניקוי הקלטות - Clearpoint</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">
              🗑️ דוח ניקוי הקלטות
            </h1>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 16px;">Clearpoint Cleanup System</p>
            <p style="color: #999; margin: 5px 0 0 0; font-size: 14px;">${new Date().toLocaleDateString('he-IL', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
          
          <!-- Summary Stats -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px; border-radius: 8px; text-align: center; color: white;">
              <div style="font-size: 32px; font-weight: bold;">${reportData.totalFilesDeleted}</div>
              <div style="font-size: 14px; opacity: 0.9;">קבצים נמחקו</div>
            </div>
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 8px; text-align: center; color: white;">
              <div style="font-size: 32px; font-weight: bold;">${reportData.executionTimeSeconds}s</div>
              <div style="font-size: 14px; opacity: 0.9;">זמן ריצה</div>
            </div>
          </div>
          
          <!-- Detailed Stats -->
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #333; margin-top: 0; font-size: 18px;">📊 סטטיסטיקות</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555; border-bottom: 1px solid #e5e7eb;">קבצים שנסרקו:</td>
                <td style="padding: 10px 0; color: #333; text-align: left; border-bottom: 1px solid #e5e7eb;">${reportData.totalFilesScanned.toLocaleString('he-IL')}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555; border-bottom: 1px solid #e5e7eb;">קבצים נמחקו:</td>
                <td style="padding: 10px 0; color: #dc2626; font-weight: bold; text-align: left; border-bottom: 1px solid #e5e7eb;">${reportData.totalFilesDeleted.toLocaleString('he-IL')}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555; border-bottom: 1px solid #e5e7eb;">לקוחות עם מנוי:</td>
                <td style="padding: 10px 0; color: #10b981; text-align: left; border-bottom: 1px solid #e5e7eb;">${reportData.usersWithActiveSubscription}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555; border-bottom: 1px solid #e5e7eb;">לקוחות ללא מנוי:</td>
                <td style="padding: 10px 0; color: #f59e0b; text-align: left; border-bottom: 1px solid #e5e7eb;">${reportData.usersWithoutSubscription}</td>
              </tr>
              ${reportData.errors > 0 ? `
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #dc2626;">שגיאות:</td>
                <td style="padding: 10px 0; color: #dc2626; font-weight: bold; text-align: left;">${reportData.errors}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <!-- Breakdown by Category -->
          <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #0369a1; margin-top: 0; font-size: 16px;">📁 פירוט מחיקות</h3>
            <ul style="color: #0284c7; margin: 0; padding-right: 20px; font-size: 14px;">
              <li><strong>${reportData.deletedByCategory.withSubscription}</strong> קבצים מלקוחות עם מנוי (14+ ימים)</li>
              <li><strong>${reportData.deletedByCategory.withoutSubscription}</strong> קבצים מלקוחות ללא מנוי (3+ ימים)</li>
              <li><strong>${reportData.deletedByCategory.admin}</strong> קבצים ממשתמשי אדמין (14+ ימים)</li>
            </ul>
          </div>
          
          <!-- Storage Saved Estimate -->
          ${reportData.totalFilesDeleted > 0 ? `
          <div style="background: #d1fae5; border: 1px solid #6ee7b7; padding: 15px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
            <div style="font-size: 18px; color: #065f46; font-weight: bold;">
              💾 חיסכון משוער: ~${((reportData.totalFilesDeleted * 50) / 1024).toFixed(2)} GB
            </div>
            <div style="font-size: 13px; color: #047857; margin-top: 5px;">
              (הערכה: 50MB לקובץ בממוצע)
            </div>
          </div>
          ` : ''}
          
          <!-- Footer -->
          <div style="text-align: center; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              דוח זה נשלח אוטומטית לאחר כל הרצה של cleanupOldVods
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
              Clearpoint Security - Automated Cleanup System
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const result = await resend.emails.send({
      from: 'Clearpoint System <system@clearpoint.co.il>',
      to: [reportData.to],
      subject: `🗑️ דוח ניקוי הקלטות - ${reportData.totalFilesDeleted} קבצים נמחקו`,
      html: emailHtml,
      text: `
דוח ניקוי הקלטות - Clearpoint Security
${new Date().toLocaleString('he-IL')}

📊 סיכום:
- קבצים נסרקו: ${reportData.totalFilesScanned.toLocaleString('he-IL')}
- קבצים נמחקו: ${reportData.totalFilesDeleted.toLocaleString('he-IL')}
- זמן ריצה: ${reportData.executionTimeSeconds} שניות

👥 לקוחות:
- עם מנוי פעיל: ${reportData.usersWithActiveSubscription}
- ללא מנוי: ${reportData.usersWithoutSubscription}

📁 פירוט מחיקות:
- לקוחות עם מנוי (14+ ימים): ${reportData.deletedByCategory.withSubscription}
- לקוחות ללא מנוי (3+ ימים): ${reportData.deletedByCategory.withoutSubscription}
- משתמשי אדמין (14+ ימים): ${reportData.deletedByCategory.admin}

${reportData.errors > 0 ? `⚠️ שגיאות: ${reportData.errors}` : '✅ ללא שגיאות'}

💾 חיסכון משוער: ~${((reportData.totalFilesDeleted * 50) / 1024).toFixed(2)} GB
      `.trim()
    });
    
    if (result.error) {
      console.error('❌ [EMAIL] Failed to send cleanup report:', result.error);
      return { success: false, error: result.error.message };
    }
    
    console.log(`✅ [EMAIL] Cleanup report sent successfully! ID: ${result.data?.id}`);
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ [EMAIL] Error sending cleanup report:', error);
    return { success: false, error: error.message || 'Unknown email error' };
  }
}

export async function sendInvoiceEmail(emailData: InvoiceEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📧 [EMAIL] Sending invoice email to: ${emailData.to}`);
    
    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>חשבונית - Clearpoint Security</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">
              📄 חשבונית חודשית
            </h1>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 16px;">Clearpoint Security System</p>
          </div>
          
          <!-- Greeting -->
          <div style="margin-bottom: 25px;">
            <p style="color: #333; font-size: 16px; margin: 0;">
              שלום ${emailData.userName},
            </p>
            <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">
              תודה על המשך השימוש במערכת Clearpoint Security!
            </p>
          </div>
          
          <!-- Invoice Details -->
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #333; margin-top: 0; font-size: 20px;">פרטי החשבונית</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555; width: 40%;">מספר חשבונית:</td>
                <td style="padding: 8px 0; color: #333;">${emailData.invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">תאריך תשלום:</td>
                <td style="padding: 8px 0; color: #333;">${emailData.paymentDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">סכום:</td>
                <td style="padding: 8px 0; color: #2563eb; font-weight: bold; font-size: 18px;">₪${emailData.amount.toFixed(2)}</td>
              </tr>
              ${emailData.nextPaymentDate ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">חיוב הבא:</td>
                <td style="padding: 8px 0; color: #666;">${emailData.nextPaymentDate}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <!-- Payment Success Message -->
          <div style="background: #d1fae5; border: 1px solid #6ee7b7; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 24px;">✅</span>
              <div>
                <h3 style="color: #065f46; margin: 0; font-size: 16px;">התשלום עבר בהצלחה</h3>
                <p style="color: #047857; margin: 5px 0 0 0; font-size: 14px;">הגישה למערכת ממשיכה ללא הפרעה</p>
              </div>
            </div>
          </div>
          
          <!-- View Invoice Button -->
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${emailData.invoiceUrl}" 
               style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
              צפה בחשבונית והדפס
            </a>
          </div>
          
          <!-- Additional Info -->
          <div style="background: #e0f2fe; border: 1px solid #7dd3fc; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #0369a1; margin-top: 0; font-size: 16px;">💡 מידע חשוב</h3>
            <ul style="color: #0284c7; margin: 0; padding-right: 20px; font-size: 14px;">
              <li>החיוב מתבצע אוטומטית כל חודש</li>
              <li>החשבונית נשמרת באזור האישי שלך</li>
              <li>ניתן להדפיס ולהוריד את החשבונית בכל עת</li>
              <li>לביטול המנוי, ניתן לפנות לתמיכה</li>
            </ul>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              יש שאלות? נשמח לעזור!
            </p>
            <p style="color: #2563eb; font-size: 14px; margin: 5px 0;">
              <a href="mailto:support@clearpoint.co.il" style="color: #2563eb; text-decoration: none;">support@clearpoint.co.il</a>
            </p>
            <p style="color: #999; font-size: 12px; margin: 15px 0 0 0;">
              מייל זה נשלח אוטומטית מ-Clearpoint Security
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const result = await resend.emails.send({
      from: 'Clearpoint Security <billing@clearpoint.co.il>',
      to: [emailData.to],
      subject: `📄 חשבונית ${emailData.invoiceNumber} - Clearpoint Security`,
      html: emailHtml,
      text: `
שלום ${emailData.userName},

חשבונית חודשית - Clearpoint Security

מספר חשבונית: ${emailData.invoiceNumber}
תאריך תשלום: ${emailData.paymentDate}
סכום: ₪${emailData.amount.toFixed(2)}
${emailData.nextPaymentDate ? `חיוב הבא: ${emailData.nextPaymentDate}` : ''}

✅ התשלום עבר בהצלחה

לצפייה בחשבונית והדפסה:
${emailData.invoiceUrl}

יש שאלות? צור קשר: support@clearpoint.co.il
      `.trim()
    });
    
    if (result.error) {
      console.error('❌ [EMAIL] Failed to send invoice email:', result.error);
      return { success: false, error: result.error.message };
    }
    
    console.log(`✅ [EMAIL] Invoice email sent successfully! ID: ${result.data?.id}`);
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ [EMAIL] Error sending invoice email:', error);
    return { success: false, error: error.message || 'Unknown email error' };
  }
}
