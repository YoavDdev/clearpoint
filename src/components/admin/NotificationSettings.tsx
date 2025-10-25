import { useState, useEffect } from 'react';
import { Bell, Mail, Phone, Save, Check } from 'lucide-react';

interface NotificationSettingsProps {
  className?: string;
}

interface NotificationConfig {
  email: string;
  phone: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  notifyOnCritical: boolean;
  notifyOnHigh: boolean;
  notifyOnMedium: boolean;
  notifyOnLow: boolean;
}

export default function NotificationSettings({ className = '' }: NotificationSettingsProps) {
  // Default to environment variables for support team contact info
  const [config, setConfig] = useState<NotificationConfig>({
    email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@clearpoint.co.il',
    phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || '0548132603',
    emailEnabled: true,
    whatsappEnabled: false, // Disabled by default until implemented
    notifyOnCritical: true,
    notifyOnHigh: true,
    notifyOnMedium: true,
    notifyOnLow: false,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Load config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('notificationConfig');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Failed to parse saved notification config');
      }
    }
  }, []);
  
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Save to localStorage
      localStorage.setItem('notificationConfig', JSON.stringify(config));
      
      // In a production app, you would save to the database here
      // For now, we'll just simulate an API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleChange = (field: keyof NotificationConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center mb-6">
        <Bell className="text-blue-600 mr-3" size={24} />
        <h2 className="text-xl font-semibold text-slate-800">הגדרות התראות</h2>
      </div>
      
      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Mail className="text-blue-600 mr-2" size={18} />
              <h3 className="font-medium text-slate-700">התראות דוא"ל</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={config.emailEnabled}
                onChange={e => handleChange('emailEnabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">כתובת דוא"ל</label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={config.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="your@email.com"
              dir="ltr"
            />
          </div>
        </div>
        
        {/* WhatsApp Notifications */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Phone className="text-green-600 mr-2" size={18} />
              <h3 className="font-medium text-slate-700">התראות WhatsApp</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={config.whatsappEnabled}
                onChange={e => handleChange('whatsappEnabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">מספר טלפון</label>
            <input
              type="tel"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              value={config.phone}
              onChange={e => handleChange('phone', e.target.value)}
              placeholder="05X-XXX-XXXX"
              dir="ltr"
            />
          </div>
        </div>
        
        {/* Severity Levels */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <h3 className="font-medium text-slate-700 mb-4">רמות חומרה להתראות</h3>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="critical"
                type="checkbox"
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                checked={config.notifyOnCritical}
                onChange={e => handleChange('notifyOnCritical', e.target.checked)}
              />
              <label htmlFor="critical" className="mr-2 text-sm font-medium text-slate-700 flex items-center">
                <span className="w-3 h-3 bg-red-600 rounded-full inline-block ml-2"></span>
                קריטי (Critical)
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="high"
                type="checkbox"
                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                checked={config.notifyOnHigh}
                onChange={e => handleChange('notifyOnHigh', e.target.checked)}
              />
              <label htmlFor="high" className="mr-2 text-sm font-medium text-slate-700 flex items-center">
                <span className="w-3 h-3 bg-orange-600 rounded-full inline-block ml-2"></span>
                גבוה (High)
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="medium"
                type="checkbox"
                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                checked={config.notifyOnMedium}
                onChange={e => handleChange('notifyOnMedium', e.target.checked)}
              />
              <label htmlFor="medium" className="mr-2 text-sm font-medium text-slate-700 flex items-center">
                <span className="w-3 h-3 bg-amber-600 rounded-full inline-block ml-2"></span>
                בינוני (Medium)
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="low"
                type="checkbox"
                className="w-4 h-4 text-lime-600 border-gray-300 rounded focus:ring-lime-500"
                checked={config.notifyOnLow}
                onChange={e => handleChange('notifyOnLow', e.target.checked)}
              />
              <label htmlFor="low" className="mr-2 text-sm font-medium text-slate-700 flex items-center">
                <span className="w-3 h-3 bg-lime-600 rounded-full inline-block ml-2"></span>
                נמוך (Low)
              </label>
            </div>
          </div>
        </div>
        
        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center px-4 py-2 rounded-md text-white ${
              saveSuccess ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
            } transition-colors`}
          >
            {saveSuccess ? (
              <>
                <Check size={18} className="ml-2" />
                נשמר בהצלחה
              </>
            ) : (
              <>
                <Save size={18} className="ml-2" />
                {isSaving ? 'שומר...' : 'שמור הגדרות'}
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Test Notification Button */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <button
          onClick={async () => {
            try {
              const response = await fetch('/api/admin/diagnostics/test-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  type: 'test_notification',
                  message: 'זוהי התראת בדיקה מדף הגדרות ההתראות',
                  severity: 'medium'
                })
              });
              
              const result = await response.json();
              
              if (result.success) {
                alert('✅ התראת בדיקה נשלחה בהצלחה!');
              } else {
                alert('❌ שגיאה בשליחת התראה: ' + result.error);
              }
            } catch (error) {
              console.error('Error sending test alert:', error);
              alert('❌ שגיאה בשליחת התראת בדיקה');
            }
          }}
          className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md flex items-center justify-center"
        >
          <Bell size={18} className="ml-2" />
          שלח התראת בדיקה
        </button>
      </div>
    </div>
  );
}
