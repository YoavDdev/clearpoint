import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Email configuration using Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// WhatsApp API configuration (using WhatsApp Business API or similar service)
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

export interface NotificationData {
  type: 'camera_offline' | 'disk_full' | 'stream_error' | 'device_error' | 'high_usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  cameraName: string;
  customerName: string;
  message: string;
  timestamp: string;
}

export async function sendEmailNotification(data: NotificationData): Promise<boolean> {
  try {
    const subject = `🚨 Clearpoint Security Alert - ${data.severity.toUpperCase()}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🛡️ Clearpoint Security Alert</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
          <div style="background: ${getSeverityColor(data.severity)}; color: white; padding: 10px; border-radius: 6px; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 18px;">⚠️ ${data.severity.toUpperCase()} SEVERITY ALERT</h2>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid ${getSeverityColor(data.severity)};">
            <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">Alert Details:</p>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Type:</strong> ${getAlertTypeText(data.type)}</li>
              <li><strong>Camera:</strong> ${data.cameraName}</li>
              <li><strong>Customer:</strong> ${data.customerName}</li>
              <li><strong>Time:</strong> ${new Date(data.timestamp).toLocaleString('he-IL')}</li>
            </ul>
          </div>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin-top: 15px;">
            <p style="margin: 0; color: #dc2626; font-weight: bold;">Message:</p>
            <p style="margin: 5px 0 0 0; color: #7f1d1d;">${data.message}</p>
          </div>
          
          <div style="margin-top: 20px; text-align: center;">
            <a href="http://localhost:3000/admin/diagnostics" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              🔍 View Diagnostics Dashboard
            </a>
          </div>
        </div>
        
        <div style="background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; font-size: 12px;">
            Clearpoint Security Monitoring System<br>
            Automated Alert - ${new Date().toLocaleString('he-IL')}
          </p>
        </div>
      </div>
    `;

    const { data: emailData, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // Using Resend's default verified sender for testing
      to: ['yoavddev@gmail.com'],
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

🔗 Check diagnostics: http://localhost:3000/admin/diagnostics`;

    // For production, you would use a service like Twilio or MessageBird
    // This is a placeholder for the actual implementation
    console.log(`Would send WhatsApp message to +972548132603: ${message}`);
    
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
    console.log('WhatsApp notification prepared for:', '+972548132603');
    
    // Store the notification in the database for tracking
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    await supabase.from('notification_logs').insert({
      type: 'whatsapp',
      recipient: '+972548132603',
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
    case 'disk_full': return '💾 Disk Space Critical';
    case 'stream_error': return '📺 Stream Error';
    case 'device_error': return '⚙️ Device Error';
    case 'high_usage': return '📊 High Resource Usage';
    default: return '⚠️ System Alert';
  }
}
