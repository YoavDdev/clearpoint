import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Email configuration using Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// WhatsApp API configuration (using WhatsApp Business API or similar service)
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

export interface NotificationData {
  type: 'camera_offline' | 'camera_online' | 'disk_full' | 'stream_error' | 'device_error' | 'high_usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  cameraName: string;
  customerName: string;
  message: string;
  timestamp: string;
}

export async function sendEmailNotification(data: NotificationData): Promise<boolean> {
  try {
    const isRecovery = data.type === 'camera_online';
    const subject = isRecovery 
      ? `Clearpoint - מצלמה חזרה לפעול` 
      : `Clearpoint - ${getSeverityHebrew(data.severity)} - ${data.cameraName}`;
    
    const problemInfo = getProblemInfo(data.type);
    
    const htmlContent = `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${isRecovery ? '#059669' : '#dc2626'} 0%, ${isRecovery ? '#10b981' : '#ef4444'} 100%); color: white; padding: 25px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Clearpoint Security</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">${isRecovery ? 'הבעיה נפתרה!' : 'התראת מערכת'}</p>
        </div>
        
        <div style="padding: 25px; background: #f8fafc;">
          <!-- Alert Type Badge -->
          <div style="background: ${isRecovery ? '#10b981' : getSeverityColor(data.severity)}; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 22px; font-weight: bold;">${problemInfo.title}</h2>
          </div>
          
          <!-- Camera & Customer Info -->
          <div style="background: white; padding: 20px; border-radius: 8px; border-right: 4px solid ${getSeverityColor(data.severity)}; margin-bottom: 20px;">
            <div style="margin-bottom: 12px;">
              <span style="color: #64748b; font-size: 14px;">מצלמה:</span>
              <strong style="font-size: 18px; color: #1e293b; margin-right: 8px;">${data.cameraName}</strong>
            </div>
            <div style="margin-bottom: 12px;">
              <span style="color: #64748b; font-size: 14px;">לקוח:</span>
              <strong style="font-size: 16px; color: #1e293b; margin-right: 8px;">${data.customerName}</strong>
            </div>
            <div>
              <span style="color: #64748b; font-size: 14px;">זמן:</span>
              <strong style="font-size: 14px; color: #1e293b; margin-right: 8px;">${new Date(data.timestamp).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}</strong>
            </div>
          </div>
          
          ${!isRecovery ? `
          <!-- Problem Explanation -->
          <div style="background: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; color: #dc2626; font-size: 18px;">מה הבעיה?</h3>
            <p style="margin: 0; color: #7f1d1d; font-size: 15px; line-height: 1.6;">
              ${problemInfo.problem}
            </p>
          </div>
          
          <!-- What Happened -->
          <div style="background: #fff7ed; border: 2px solid #fdba74; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; color: #ea580c; font-size: 18px;">מה קרה?</h3>
            <p style="margin: 0; color: #9a3412; font-size: 15px; line-height: 1.6;">
              ${data.message}
            </p>
          </div>
          
          <!-- Solutions -->
          <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; color: #16a34a; font-size: 18px;">איך לפתור?</h3>
            <div style="color: #166534; font-size: 15px; line-height: 1.8;">
              ${problemInfo.solutions.map((sol: string, i: number) => `
                <div style="margin-bottom: 10px; padding-right: 20px; position: relative;">
                  <strong style="position: absolute; right: 0; color: #16a34a;">${i + 1}.</strong>
                  ${sol}
                </div>
              `).join('')}
            </div>
          </div>
          ` : `
          <!-- Recovery Message -->
          <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
            <h3 style="margin: 0 0 12px 0; color: #16a34a; font-size: 20px;">הכל חזר לפעול!</h3>
            <p style="margin: 0; color: #166534; font-size: 16px; line-height: 1.6;">
              המצלמה <strong>${data.cameraName}</strong> חזרה לעבוד תקין.<br>
              ניתן להמשיך לצפות בשידור החי והקלטות.
            </p>
          </div>
          `}
          
          <!-- Action Button -->
          <div style="text-align: center; margin-top: 25px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/diagnostics" 
               style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              לצפייה במערכת הניטור
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px; line-height: 1.6;">
            <strong style="color: #e2e8f0;">Clearpoint Security</strong><br>
            מערכת ניטור אוטומטית<br>
            ${new Date().toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        </div>
      </div>
    `;

    // Send to support team (customer service agents) - NOT to end customers
    const supportEmails = process.env.SUPPORT_TEAM_EMAILS?.split(',').map(e => e.trim()) || ['yoavddev@gmail.com'];
    
    const { data: emailData, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'alerts@clearpoint.co.il',
      to: supportEmails,
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error('Resend API error:', error);
      return false;
    }

    console.log('Email notification sent successfully with Resend:', emailData);
    return true;
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return false;
  }
}

export async function sendWhatsAppNotification(data: NotificationData): Promise<boolean> {
  try {
    // Format the message with emojis and formatting for WhatsApp
    const message = `🚨 *Clearpoint Security Alert*
    
*${data.severity.toUpperCase()} SEVERITY*
${getAlertTypeText(data.type)}

📹 *Camera:* ${data.cameraName}
👤 *Customer:* ${data.customerName}
🕐 *Time:* ${new Date(data.timestamp).toLocaleString('he-IL')}

⚠️ *Issue:* ${data.message}

🔗 Check diagnostics: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/diagnostics`;

    // For production, you would use a service like Twilio or MessageBird
    // This is a placeholder for the actual implementation
    const supportPhone = process.env.SUPPORT_TEAM_PHONE || '+972548132603';
    console.log(`Would send WhatsApp message to ${supportPhone}: ${message}`);
    
    // Simulate API call for now - in production, replace with actual API call
    // Example with Twilio:
    /*
    const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const messageResponse = await twilioClient.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:+972548132603`
    });
    console.log('WhatsApp sent with SID:', messageResponse.sid);
    */
    
    // For now, we'll log the message and return success
    // In production, you would check the API response
    console.log('WhatsApp notification prepared for:', supportPhone);
    
    // Store the notification in the database for tracking
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    await supabase.from('notification_logs').insert({
      type: 'whatsapp',
      recipient: supportPhone,
      message: message,
      alert_type: data.type,
      severity: data.severity,
      camera_name: data.cameraName,
      customer_name: data.customerName,
      sent_at: new Date().toISOString(),
      status: 'pending' // In production, update this based on API response
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
    return false;
  }
}

export async function sendNotifications(data: NotificationData): Promise<{ email: boolean; whatsapp: boolean }> {
  const [emailResult, whatsappResult] = await Promise.all([
    sendEmailNotification(data),
    sendWhatsAppNotification(data),
  ]);

  return {
    email: emailResult,
    whatsapp: whatsappResult,
  };
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#dc2626'; // red-600
    case 'high': return '#ea580c'; // orange-600
    case 'medium': return '#d97706'; // amber-600
    case 'low': return '#65a30d'; // lime-600
    default: return '#6b7280'; // gray-500
  }
}

function getAlertTypeText(type: string): string {
  switch (type) {
    case 'camera_offline': return '📵 Camera Offline';
    case 'camera_online': return '✅ Camera Recovered';
    case 'disk_full': return '💾 Disk Space Critical';
    case 'stream_error': return '📺 Stream Error';
    case 'device_error': return '⚙️ Device Error';
    case 'high_usage': return '📊 High Resource Usage';
    default: return '⚠️ System Alert';
  }
}

function getSeverityHebrew(severity: string): string {
  switch (severity) {
    case 'critical': return 'דחוף מאוד';
    case 'high': return 'דחוף';
    case 'medium': return 'בינוני';
    case 'low': return 'נמוך';
    default: return 'התראה';
  }
}

interface ProblemInfo {
  title: string;
  problem: string;
  solutions: string[];
}

function getProblemInfo(type: string): ProblemInfo {
  switch (type) {
    case 'camera_offline':
      return {
        title: 'המצלמה לא מגיבה',
        problem: 'המצלמה לא שולחת מידע למערכת. זה יכול לקרות כשהחשמל נותק, האינטרנט לא עובד, או שיש בעיה במצלמה עצמה.',
        solutions: [
          'בדוק שהחשמל מחובר למצלמה והנורית דולקת',
          'בדוק שהכבלים לא התנתקו (חשמל + רשת)',
          'נסה להפעיל מחדש את המצלמה (נתק וחבר חזרה)',
          'בדוק שהאינטרנט עובד במקום (נסה לגלוש באינטרנט)',
          'אם כלום לא עוזר - צור קשר עם התמיכה'
        ]
      };
    
    case 'stream_error':
      return {
        title: 'בעיה בשידור המצלמה',
        problem: 'המצלמה מחוברת אבל השידור לא מעודכן. זה בדרך כלל קורה כשהאינטרנט איטי מדי או שיש בעיה בתוכנת המצלמה.',
        solutions: [
          'בדוק את מהירות האינטרנט (צריך לפחות 2 מגה להעלאה)',
          'נסה להפעיל מחדש את הנתב (Router) - נתק ל-30 שניות וחבר חזרה',
          'נסה להפעיל מחדש את המצלמה',
          'בדוק שאין מכשירים אחרים שמשתמשים בהרבה אינטרנט',
          'אם הבעיה ממשיכה - צור קשר עם התמיכה'
        ]
      };
    
    case 'disk_full':
      return {
        title: 'האחסון מתמלא',
        problem: 'הדיסק הקשיח במחשב הקטן מתמלא. אם הוא יתמלא לגמרי, המצלמה תפסיק להקליט.',
        solutions: [
          'המערכת תמחק אוטומטית הקלטות ישנות כדי לפנות מקום',
          'אם הבעיה חוזרת - ייתכן שצריך דיסק גדול יותר',
          'צור קשר עם התמיכה לבדיקה',
          'אל תמחק קבצים ידנית!'
        ]
      };
    
    case 'device_error':
      return {
        title: 'בעיה במחשב הקטן',
        problem: 'המחשב הקטן שמנהל את המצלמות לא עובד כמו שצריך. זה יכול להשפיע על כל המצלמות.',
        solutions: [
          'בדוק שהמחשב הקטן מקבל חשמל (נורית דולקת)',
          'נסה להפעיל אותו מחדש (נתק וחבר חזרה)',
          'בדוק שהאינטרנט עובד',
          'המתן 5 דקות - לפעמים זה מתקן את עצמו',
          'אם הבעיה ממשיכה - התקשר לתמיכה בדחיפות'
        ]
      };
    
    case 'high_usage':
      return {
        title: 'המערכת עובדת קשה',
        problem: 'המחשב הקטן עובד בעומס גבוה. זה יכול להאט את המערכת או לגרום לבעיות.',
        solutions: [
          'זה יכול להיות זמני - המתן כמה דקות',
          'אל תנתק חשמל! תן למערכת לסיים את העבודה',
          'אם זה ממשיך יותר מ-30 דקות - צור קשר עם התמיכה',
          'ייתכן שצריך לשדרג את המערכת'
        ]
      };
    
    case 'camera_online':
      return {
        title: 'המצלמה חזרה לפעול',
        problem: '',
        solutions: []
      };
    
    default:
      return {
        title: 'התראת מערכת',
        problem: 'זוהתה בעיה במערכת שדורשת תשומת לב.',
        solutions: [
          'בדוק את מערכת הניטור לפרטים נוספים',
          'במידת הצורך, צור קשר עם התמיכה'
        ]
      };
  }
}
