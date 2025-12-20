"use client";

import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Play, Users, Clock } from "lucide-react";

interface Subscription {
  subscription_id: string;
  user_id: string;
  email: string;
  full_name: string;
  status: string;
  amount: string;
  last_sync_with_payplus: string | null;
  last_payment_date: string | null;
  next_payment_date: string | null;
  payment_failures: number;
  recurring_uid: string | null;
  payplus_customer_uid: string | null;
  sync_reason: string;
  priority: number;
}

interface SyncResult {
  user_id: string;
  status: string;
  result?: any;
  error?: string;
}

export default function SubscriptionsSyncDashboard() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<Map<string, SyncResult>>(new Map());

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/subscriptions-needing-sync");
      const data = await response.json();
      if (data.success) {
        setSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const syncSingleUser = async (userId: string) => {
    setSyncing(userId);
    try {
      const response = await fetch(`/api/admin/sync-subscription/${userId}`, {
        method: "POST",
      });
      const result = await response.json();

      const newResults = new Map(syncResults);
      newResults.set(userId, {
        user_id: userId,
        status: result.success ? "synced" : "failed",
        result: result.result,
        error: result.error,
      });
      setSyncResults(newResults);

      // רענן את הרשימה
      setTimeout(fetchSubscriptions, 1000);
    } catch (error) {
      console.error("Sync error:", error);
      const newResults = new Map(syncResults);
      newResults.set(userId, {
        user_id: userId,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      setSyncResults(newResults);
    } finally {
      setSyncing(null);
    }
  };

  const syncAllUsers = async (force: boolean = false) => {
    setBulkSyncing(true);
    setSyncResults(new Map());
    try {
      const response = await fetch("/api/admin/sync-all-subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ force }),
      });
      const result = await response.json();

      if (result.success && result.stats?.details) {
        const newResults = new Map<string, SyncResult>();
        result.stats.details.forEach((detail: SyncResult) => {
          newResults.set(detail.user_id, detail);
        });
        setSyncResults(newResults);
      }

      // רענן את הרשימה
      setTimeout(fetchSubscriptions, 1000);
    } catch (error) {
      console.error("Bulk sync error:", error);
    } finally {
      setBulkSyncing(false);
    }
  };

  const getSyncReasonBadge = (reason: string) => {
    const reasons: Record<string, { label: string; color: string; icon: string }> = {
      never_synced: { label: "מעולם לא סונכרן", color: "bg-red-100 text-red-800", icon: "🆕" },
      stale_sync: { label: "סנכרון ישן", color: "bg-yellow-100 text-yellow-800", icon: "⏰" },
      has_failures: { label: "יש כשלונות", color: "bg-orange-100 text-orange-800", icon: "⚠️" },
      payment_failed: { label: "תשלום נכשל", color: "bg-red-100 text-red-800", icon: "❌" },
      routine_check: { label: "בדיקה שגרתית", color: "bg-blue-100 text-blue-800", icon: "✅" },
    };

    const config = reasons[reason] || reasons.routine_check;
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  };

  const getSyncResultBadge = (userId: string) => {
    const result = syncResults.get(userId);
    if (!result) return null;

    if (result.status === "synced") {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle size={14} />
          <span>סונכרן בהצלחה</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle size={14} />
          <span>נכשל: {result.error}</span>
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600">טוען מנויים...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <RefreshCw size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800">ניהול סנכרון מנויים</h1>
              <p className="text-slate-600">סנכרן חיובים מ-PayPlus ואמת סטטוסים</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-600 text-sm mb-1">מנויים צריכים sync</div>
                  <div className="text-3xl font-bold text-purple-700">{subscriptions.length}</div>
                </div>
                <Users size={32} className="text-purple-500" />
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-green-600 text-sm mb-1">סונכרנו בהצלחה</div>
                  <div className="text-3xl font-bold text-green-700">
                    {Array.from(syncResults.values()).filter((r) => r.status === "synced").length}
                  </div>
                </div>
                <CheckCircle size={32} className="text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-red-600 text-sm mb-1">נכשלו</div>
                  <div className="text-3xl font-bold text-red-700">
                    {Array.from(syncResults.values()).filter((r) => r.status !== "synced").length}
                  </div>
                </div>
                <XCircle size={32} className="text-red-500" />
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => syncAllUsers(false)}
              disabled={bulkSyncing || subscriptions.length === 0}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {bulkSyncing ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>מסנכרן...</span>
                </>
              ) : (
                <>
                  <Play size={20} />
                  <span>סנכרן הכל ({subscriptions.length})</span>
                </>
              )}
            </button>
            <button
              onClick={() => syncAllUsers(true)}
              disabled={bulkSyncing}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {bulkSyncing ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>מסנכרן...</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={20} />
                  <span>סנכרן הכל בכוח (כל המנויים)</span>
                </>
              )}
            </button>
            <button
              onClick={fetchSubscriptions}
              disabled={loading}
              className="px-6 py-4 bg-white text-slate-700 rounded-xl hover:bg-slate-100 transition-all shadow-lg font-bold border-2 border-slate-200"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Subscriptions Table */}
        {subscriptions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
            <h3 className="text-2xl font-bold text-slate-800 mb-2">הכל מסונכרן! 🎉</h3>
            <p className="text-slate-600">כל המנויים מעודכנים ולא צריכים סנכרון</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-bold text-purple-900">לקוח</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-purple-900">סטטוס</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-purple-900">סכום חודשי</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-purple-900">סיבה לסנכרון</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-purple-900">סנכרון אחרון</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-purple-900">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {subscriptions.map((sub) => (
                    <tr key={sub.subscription_id} className="hover:bg-purple-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-bold text-slate-800">{sub.full_name}</div>
                          <div className="text-sm text-slate-600">{sub.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          sub.status === 'active' ? 'bg-green-100 text-green-800' :
                          sub.status === 'payment_failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-purple-700">₪{sub.amount}</span>
                      </td>
                      <td className="px-6 py-4">
                        {getSyncReasonBadge(sub.sync_reason)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {sub.last_sync_with_payplus ? (
                          <div className="flex items-center gap-2">
                            <Clock size={14} />
                            {new Date(sub.last_sync_with_payplus).toLocaleDateString("he-IL")}
                          </div>
                        ) : (
                          <span className="text-red-600 font-medium">מעולם לא סונכרן</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <button
                            onClick={() => syncSingleUser(sub.user_id)}
                            disabled={syncing === sub.user_id || bulkSyncing}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:scale-105 transition-all shadow-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          >
                            {syncing === sub.user_id ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              "סנכרן עכשיו"
                            )}
                          </button>
                          {getSyncResultBadge(sub.user_id)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
