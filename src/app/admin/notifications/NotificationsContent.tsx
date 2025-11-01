"use client";

import { useState } from "react";
import { 
  Mail, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  User,
  Camera,
  Inbox,
  Edit,
  Trash2,
  Check,
  X,
  Save
} from "lucide-react";

interface Alert {
  id: string;
  type: string;
  message: string;
  severity: string;
  camera_name?: string;
  created_at: string;
  resolved: boolean;
  camera?: {
    name: string;
    user: {
      full_name: string;
      email: string;
    };
  };
}

interface Customer {
  id: string;
  full_name: string;
  email: string;
}

interface Props {
  alerts: Alert[];
  customers: Customer[];
}

export function NotificationsContent({ alerts, customers }: Props) {
  const [activeTab, setActiveTab] = useState<"inbox" | "compose">("inbox");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [deletingAll, setDeletingAll] = useState(false);

  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);

  const handleDeleteAll = async () => {
    if (!confirm("⚠️ האם אתה בטוח שברצונך למחוק את כל ההתראות? פעולה זו לא ניתנת לביטול!")) {
      return;
    }

    setDeletingAll(true);
    try {
      const response = await fetch("/api/admin/alerts/delete-all", {
        method: "DELETE"
      });

      if (response.ok) {
        alert("✅ כל ההתראות נמחקו בהצלחה!");
        window.location.reload();
      } else {
        alert("❌ שגיאה במחיקת התראות");
      }
    } catch (error) {
      console.error("Error deleting all alerts:", error);
      alert("❌ שגיאה במחיקת התראות");
    } finally {
      setDeletingAll(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק התראה זו?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/alerts/${alertId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        alert("✅ ההתראה נמחקה בהצלחה!");
        window.location.reload();
      } else {
        alert("❌ שגיאה במחיקת ההתראה");
      }
    } catch (error) {
      console.error("Error deleting alert:", error);
      alert("❌ שגיאה במחיקת ההתראה");
    }
  };

  const handleToggleResolved = async (alertId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/alerts/${alertId}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: !currentStatus })
      });

      if (response.ok) {
        alert(currentStatus ? "✅ ההתראה סומנה כלא טופלה" : "✅ ההתראה סומנה כטופלה");
        window.location.reload();
      } else {
        alert("❌ שגיאה בעדכון ההתראה");
      }
    } catch (error) {
      console.error("Error toggling alert:", error);
      alert("❌ שגיאה בעדכון ההתראה");
    }
  };

  const handleStartEdit = (alert: Alert) => {
    setEditingId(alert.id);
    setEditMessage(alert.message);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditMessage("");
  };

  const handleSaveEdit = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: editMessage })
      });

      if (response.ok) {
        alert("✅ ההתראה עודכנה בהצלחה!");
        setEditingId(null);
        setEditMessage("");
        window.location.reload();
      } else {
        alert("❌ שגיאה בעדכון ההתראה");
      }
    } catch (error) {
      console.error("Error updating alert:", error);
      alert("❌ שגיאה בעדכון ההתראה");
    }
  };

  const handleSendEmail = async () => {
    if (!selectedCustomer || !emailSubject || !emailMessage) {
      alert("נא למלא את כל השדות");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/admin/send-customer-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer,
          subject: emailSubject,
          message: emailMessage
        })
      });

      if (response.ok) {
        alert("✅ המייל נשלח בהצלחה!");
        setEmailSubject("");
        setEmailMessage("");
        setSelectedCustomer("");
      } else {
        alert("❌ שגיאה בשליחת המייל");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert("❌ שגיאה בשליחת המייל");
    } finally {
      setSending(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-700 border-red-200";
      case "high": return "bg-orange-100 text-orange-700 border-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default: return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes("camera")) return <Camera size={20} />;
    if (type.includes("minipc")) return <AlertCircle size={20} />;
    return <Mail size={20} />;
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("inbox")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all ${
              activeTab === "inbox"
                ? "bg-gradient-to-l from-blue-500 to-cyan-500 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Inbox size={20} />
            <span>התראות שהתקבלו</span>
            {unresolvedAlerts.length > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {unresolvedAlerts.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab("compose")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all ${
              activeTab === "compose"
                ? "bg-gradient-to-l from-blue-500 to-cyan-500 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Edit size={20} />
            <span>שלח מייל ללקוח</span>
          </button>
        </div>

        {/* Inbox Tab */}
        {activeTab === "inbox" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                התראות שלא טופלו ({unresolvedAlerts.length})
              </h3>
              {alerts.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingAll ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>מוחק...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      <span>מחק את כל ההתראות</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            {unresolvedAlerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                <p className="text-slate-600 text-lg">אין התראות חדשות! 🎉</p>
                <p className="text-slate-500 text-sm mt-2">כל המערכות פועלות תקין</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unresolvedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border-2 ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getTypeIcon(alert.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm">
                            {alert.type === "camera_offline" && "מצלמה לא פעילה"}
                            {alert.type === "stream_error" && "שגיאת זרם"}
                            {alert.type === "disk_full" && "דיסק מלא"}
                            {alert.type === "minipc_offline" && "Mini PC לא מחובר"}
                            {!["camera_offline", "stream_error", "disk_full", "minipc_offline"].includes(alert.type) && alert.type}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-white rounded-full border">
                            {alert.severity}
                          </span>
                        </div>
                        
                        {editingId === alert.id ? (
                          <div className="mb-2">
                            <textarea
                              value={editMessage}
                              onChange={(e) => setEditMessage(e.target.value)}
                              className="w-full px-3 py-2 text-sm border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                              rows={2}
                            />
                          </div>
                        ) : (
                          <p className="text-sm font-medium mb-2">{alert.message}</p>
                        )}
                        
                        {alert.camera && (
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <User size={14} />
                              {alert.camera.user?.full_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail size={14} />
                              {alert.camera.user?.email}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
                          <Clock size={12} />
                          {new Date(alert.created_at).toLocaleString("he-IL")}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        {editingId === alert.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(alert.id)}
                              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
                              title="שמור"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all"
                              title="ביטול"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(alert)}
                              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                              title="ערוך"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleResolved(alert.id, alert.resolved)}
                              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
                              title="סמן כטופל"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteAlert(alert.id)}
                              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                              title="מחק"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {resolvedAlerts.length > 0 && (
              <div className="mt-8 border-t-2 border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">
                    התראות שטופלו ({resolvedAlerts.length})
                  </h3>
                  <button
                    onClick={async () => {
                      if (!confirm("האם אתה בטוח שברצונך למחוק את כל ההתראות שטופלו?")) return;
                      try {
                        const response = await fetch("/api/admin/alerts/delete-resolved", {
                          method: "DELETE"
                        });
                        if (response.ok) {
                          alert("✅ כל ההתראות שטופלו נמחקו בהצלחה!");
                          window.location.reload();
                        } else {
                          alert("❌ שגיאה במחיקת התראות");
                        }
                      } catch (error) {
                        alert("❌ שגיאה במחיקת התראות");
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-all"
                  >
                    <Trash2 size={16} />
                    <span>מחק התראות שטופלו</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {resolvedAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                          <div className="flex-1">
                            <span className="font-medium block">{alert.message}</span>
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                              <Clock size={12} />
                              {new Date(alert.created_at).toLocaleString("he-IL")}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleResolved(alert.id, alert.resolved)}
                            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all"
                            title="סמן כלא טופל"
                          >
                            <X size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-all"
                            title="מחק"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compose Tab */}
        {activeTab === "compose" && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">שלח מייל ידני ללקוח</h3>
              <p className="text-sm text-slate-600">
                שלח עדכון ללקוח על תיקון או בעיה במצלמה
              </p>
            </div>

            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                בחר לקוח
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="">-- בחר לקוח --</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name} ({customer.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Templates */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                תבניות מהירות
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setEmailSubject("זיהינו בעיה במצלמה");
                    setEmailMessage("שלום,\n\nזיהינו בעיה במצלמה שלך ואנחנו עובדים על תיקון הבעיה כעת.\nנעדכן אותך בהקדם.\n\nבברכה,\nצוות Clearpoint");
                  }}
                  className="p-4 text-right rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <div className="font-semibold text-sm text-slate-800">📹 בעיה במצלמה</div>
                  <div className="text-xs text-slate-600 mt-1">הודעה על זיהוי בעיה</div>
                </button>
                
                <button
                  onClick={() => {
                    setEmailSubject("הבעיה תוקנה בהצלחה");
                    setEmailMessage("שלום,\n\nהבעיה במצלמה שלך תוקנה בהצלחה!\nהמצלמה חזרה לפעול כרגיל.\n\nבברכה,\nצוות Clearpoint");
                  }}
                  className="p-4 text-right rounded-xl border-2 border-slate-200 hover:border-green-500 hover:bg-green-50 transition-all"
                >
                  <div className="font-semibold text-sm text-slate-800">✅ תיקון הושלם</div>
                  <div className="text-xs text-slate-600 mt-1">הודעה על השלמת תיקון</div>
                </button>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                נושא
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="למשל: זיהינו בעיה במצלמה"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                תוכן ההודעה
              </label>
              <textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="כתוב את ההודעה ללקוח..."
                rows={8}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendEmail}
              disabled={sending || !selectedCustomer || !emailSubject || !emailMessage}
              className="w-full bg-gradient-to-l from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>שולח...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>שלח מייל</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
