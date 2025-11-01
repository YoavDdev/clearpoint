"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Bell,
  Mail,
  Database,
  Shield,
  Clock,
  Globe,
  Save,
  RefreshCw,
} from "lucide-react";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    // Email Settings
    emailNotifications: true,
    alertEmail: "yoavddev@gmail.com",
    emailDelay: 5,
    
    // Monitoring Settings (LOW RESOURCE)
    monitoringInterval: 10,
    healthCheckTimeout: 180,
    streamCheckTimeout: 240,
    
    // Alert Settings (LOW RESOURCE)
    criticalAlertThreshold: 10,
    autoResolveAlerts: true,
    alertRetentionDays: 14,
    
    // System Settings (LOW RESOURCE)
    logLevel: "warn",
    dataRetentionDays: 30,
    backupEnabled: true,
  });

  // Load settings from database
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      
      if (data.success && data.settings) {
        setSettings({
          emailNotifications: data.settings.email_notifications_enabled ?? true,
          alertEmail: data.settings.alert_email_address ?? "yoavddev@gmail.com",
          emailDelay: data.settings.email_delay_minutes ?? 5,
          monitoringInterval: data.settings.monitoring_interval_minutes ?? 10,
          healthCheckTimeout: data.settings.health_check_timeout_seconds ?? 180,
          streamCheckTimeout: data.settings.stream_check_timeout_seconds ?? 240,
          criticalAlertThreshold: data.settings.critical_alert_threshold_minutes ?? 10,
          autoResolveAlerts: data.settings.auto_resolve_alerts ?? true,
          alertRetentionDays: data.settings.alert_retention_days ?? 14,
          logLevel: data.settings.log_level ?? "warn",
          dataRetentionDays: data.settings.data_retention_days ?? 30,
          backupEnabled: data.settings.backup_enabled ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      alert('שגיאה בטעינת הגדרות');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Convert to database format
      const dbSettings = {
        email_notifications_enabled: settings.emailNotifications,
        alert_email_address: settings.alertEmail,
        email_delay_minutes: settings.emailDelay,
        monitoring_interval_minutes: settings.monitoringInterval,
        health_check_timeout_seconds: settings.healthCheckTimeout,
        stream_check_timeout_seconds: settings.streamCheckTimeout,
        critical_alert_threshold_minutes: settings.criticalAlertThreshold,
        auto_resolve_alerts: settings.autoResolveAlerts,
        alert_retention_days: settings.alertRetentionDays,
        log_level: settings.logLevel,
        data_retention_days: settings.dataRetentionDays,
        backup_enabled: settings.backupEnabled,
      };

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: dbSettings }),
      });

      const data = await response.json();

      if (data.success) {
        alert("✅ הגדרות נשמרו בהצלחה!");
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert('❌ שגיאה בשמירת הגדרות: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("האם אתה בטוח שברצונך לאפס את ההגדרות?")) {
      setSettings({
        emailNotifications: true,
        alertEmail: "yoavddev@gmail.com",
        emailDelay: 5,
        monitoringInterval: 10,
        healthCheckTimeout: 180,
        streamCheckTimeout: 240,
        criticalAlertThreshold: 10,
        autoResolveAlerts: true,
        alertRetentionDays: 14,
        logLevel: "warn",
        dataRetentionDays: 30,
        backupEnabled: true,
      });
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6" dir="rtl">
        <div className="max-w-7xl mx-auto pt-20">
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
            <RefreshCw size={48} className="mx-auto mb-4 text-blue-600 animate-spin" />
            <p className="text-slate-600 text-lg">טוען הגדרות...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-right">
              <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                <Settings className="text-blue-600" size={36} />
                הגדרות מערכת
              </h1>
              <p className="text-slate-600">קביעת תצורה ועדכון הגדרות המערכת</p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Email & Notifications */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Mail size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">הגדרות דוא״ל והתראות</h2>
                <p className="text-sm text-slate-600">ניהול התראות ומיילים אוטומטיים</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-slate-800">התראות דוא״ל</h3>
                  <p className="text-sm text-slate-600">שליחת התראות אוטומטיות למנהל</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block mb-2">
                  <span className="font-semibold text-slate-800">כתובת דוא״ל לקבלת התראות</span>
                  <input
                    type="email"
                    value={settings.alertEmail}
                    onChange={(e) => setSettings({ ...settings, alertEmail: e.target.value })}
                    className="mt-2 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </label>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block">
                  <span className="font-semibold text-slate-800">השהיית שליחת מייל (דקות)</span>
                  <p className="text-sm text-slate-600 mb-2">זמן המתנה לפני שליחת התראה למניעת ספאם</p>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={settings.emailDelay}
                    onChange={(e) => setSettings({ ...settings, emailDelay: parseInt(e.target.value) })}
                    className="mt-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Monitoring Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Clock size={24} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">הגדרות ניטור</h2>
                <p className="text-sm text-slate-600">תדירות ובדיקות מערכת</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block">
                  <span className="font-semibold text-slate-800">תדירות ניטור (דקות)</span>
                  <p className="text-sm text-slate-600 mb-2">כמה זמן בין בדיקות בריאות מערכת</p>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.monitoringInterval}
                    onChange={(e) => setSettings({ ...settings, monitoringInterval: parseInt(e.target.value) })}
                    className="mt-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </label>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block">
                  <span className="font-semibold text-slate-800">זמן קצוב בדיקת בריאות (שניות)</span>
                  <p className="text-sm text-slate-600 mb-2">זמן מקסימלי ללא בדיקת בריאות לפני סימון כבעיה</p>
                  <input
                    type="number"
                    min="30"
                    max="300"
                    value={settings.healthCheckTimeout}
                    onChange={(e) => setSettings({ ...settings, healthCheckTimeout: parseInt(e.target.value) })}
                    className="mt-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </label>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block">
                  <span className="font-semibold text-slate-800">זמן קצוב זרם (שניות)</span>
                  <p className="text-sm text-slate-600 mb-2">זמן מקסימלי לזרם ישן לפני התראה</p>
                  <input
                    type="number"
                    min="30"
                    max="300"
                    value={settings.streamCheckTimeout}
                    onChange={(e) => setSettings({ ...settings, streamCheckTimeout: parseInt(e.target.value) })}
                    className="mt-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Alert Management */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Bell size={24} className="text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">ניהול התראות</h2>
                <p className="text-sm text-slate-600">קביעת סף והתנהגות התראות</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block">
                  <span className="font-semibold text-slate-800">סף התראה קריטית (דקות)</span>
                  <p className="text-sm text-slate-600 mb-2">זמן לסימון התראה כקריטית</p>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.criticalAlertThreshold}
                    onChange={(e) => setSettings({ ...settings, criticalAlertThreshold: parseInt(e.target.value) })}
                    className="mt-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-slate-800">פתרון אוטומטי של התראות</h3>
                  <p className="text-sm text-slate-600">פתור התראות אוטומטית כאשר הבעיה נפתרת</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoResolveAlerts}
                    onChange={(e) => setSettings({ ...settings, autoResolveAlerts: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block">
                  <span className="font-semibold text-slate-800">שמירת התראות (ימים)</span>
                  <p className="text-sm text-slate-600 mb-2">כמה זמן לשמור התראות שנפתרו</p>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={settings.alertRetentionDays}
                    onChange={(e) => setSettings({ ...settings, alertRetentionDays: parseInt(e.target.value) })}
                    className="mt-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Database size={24} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">הגדרות מערכת</h2>
                <p className="text-sm text-slate-600">תצורה כללית של המערכת</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block">
                  <span className="font-semibold text-slate-800">רמת לוגים</span>
                  <select
                    value={settings.logLevel}
                    onChange={(e) => setSettings({ ...settings, logLevel: e.target.value })}
                    className="mt-2 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </label>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block">
                  <span className="font-semibold text-slate-800">שמירת נתונים (ימים)</span>
                  <p className="text-sm text-slate-600 mb-2">כמה זמן לשמור נתוני מערכת</p>
                  <input
                    type="number"
                    min="30"
                    max="365"
                    value={settings.dataRetentionDays}
                    onChange={(e) => setSettings({ ...settings, dataRetentionDays: parseInt(e.target.value) })}
                    className="mt-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-slate-800">גיבוי אוטומטי</h3>
                  <p className="text-sm text-slate-600">גיבוי יומי של נתוני המערכת</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.backupEnabled}
                    onChange={(e) => setSettings({ ...settings, backupEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8 mb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg"
          >
            {saving ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save size={20} />
                שמור הגדרות
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            disabled={saving}
            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 disabled:opacity-50 transition-all"
          >
            <RefreshCw size={20} className="inline-block ml-2" />
            איפוס
          </button>
        </div>
      </div>
    </main>
  );
}
