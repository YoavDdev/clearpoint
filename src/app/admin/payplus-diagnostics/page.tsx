"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Activity, AlertCircle, CheckCircle, XCircle, RefreshCw, Send, UserPlus } from "lucide-react";

interface DiagnosticResult {
  name: string;
  status: "success" | "error" | "warning";
  message: string;
  details?: any;
}

export default function PayPlusDiagnosticsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [testUserId, setTestUserId] = useState("");
  const [testWebhookData, setTestWebhookData] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [usersWithoutSub, setUsersWithoutSub] = useState<any[]>([]);
  const [creatingSubscription, setCreatingSubscription] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    setResults([]);
    const diagnostics: DiagnosticResult[] = [];

    // 1. בדיקת חיבור ל-Supabase
    try {
      const { data, error } = await supabase.from("users").select("count");
      if (error) throw error;
      diagnostics.push({
        name: "חיבור ל-Supabase",
        status: "success",
        message: "חיבור תקין",
      });
    } catch (err: any) {
      diagnostics.push({
        name: "חיבור ל-Supabase",
        status: "error",
        message: err.message,
      });
    }

    // 2. בדיקת טבלת subscriptions
    try {
      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select("id, user_id, status, payplus_customer_uid, recurring_uid")
        .limit(5);
      
      if (error) throw error;
      
      diagnostics.push({
        name: "טבלת Subscriptions",
        status: "success",
        message: `נמצאו ${subs?.length || 0} מנויים`,
        details: subs,
      });

      // בדוק כמה מנויים ללא payplus_customer_uid
      const missingUid = subs?.filter((s: any) => !s.payplus_customer_uid) || [];
      if (missingUid.length > 0) {
        diagnostics.push({
          name: "⚠️ מנויים ללא PayPlus UID",
          status: "warning",
          message: `${missingUid.length} מנויים חסרים payplus_customer_uid`,
          details: missingUid,
        });
      }
    } catch (err: any) {
      diagnostics.push({
        name: "טבלת Subscriptions",
        status: "error",
        message: err.message,
      });
    }

    // 3. בדיקת טבלת subscription_charges
    try {
      const { data: charges, error } = await supabase
        .from("subscription_charges")
        .select("id, subscription_id, amount, status, charged_at")
        .order("charged_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      diagnostics.push({
        name: "טבלת Subscription Charges",
        status: "success",
        message: `נמצאו ${charges?.length || 0} חיובים`,
        details: charges,
      });
    } catch (err: any) {
      diagnostics.push({
        name: "טבלת Subscription Charges",
        status: "error",
        message: err.message,
      });
    }

    // 4. בדיקת טבלת invoices
    try {
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("id, user_id, invoice_number, status, total_amount, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      diagnostics.push({
        name: "טבלת Invoices",
        status: "success",
        message: `נמצאו ${invoices?.length || 0} חשבוניות`,
        details: invoices,
      });
    } catch (err: any) {
      diagnostics.push({
        name: "טבלת Invoices",
        status: "error",
        message: err.message,
      });
    }

    // 5. בדיקת RPC Function
    try {
      const { data, error } = await supabase.rpc("generate_invoice_number");
      
      if (error) throw error;
      
      diagnostics.push({
        name: "RPC: generate_invoice_number",
        status: "success",
        message: `פונקציה עובדת - דוגמה: ${data}`,
      });
    } catch (err: any) {
      diagnostics.push({
        name: "RPC: generate_invoice_number",
        status: "error",
        message: "הפונקציה לא קיימת או לא עובדת",
        details: err.message,
      });
    }

    // 6. בדיקת Webhook Endpoint
    try {
      const response = await fetch("/api/webhooks/payplus/recurring", {
        method: "GET",
      });
      const data = await response.json();
      
      diagnostics.push({
        name: "Webhook Endpoint",
        status: response.ok ? "success" : "error",
        message: response.ok ? "Endpoint זמין" : "Endpoint לא זמין",
        details: data,
      });
    } catch (err: any) {
      diagnostics.push({
        name: "Webhook Endpoint",
        status: "error",
        message: err.message,
      });
    }

    // 7. בדיקת Environment Variables
    const envVars = [
      { name: "NEXT_PUBLIC_BASE_URL", value: process.env.NEXT_PUBLIC_BASE_URL },
      { name: "NEXT_PUBLIC_SUPABASE_URL", value: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ מוגדר" : "✗ חסר" },
    ];

    diagnostics.push({
      name: "Environment Variables",
      status: envVars.every(v => v.value) ? "success" : "warning",
      message: "בדיקת משתני סביבה",
      details: envVars,
    });

    // 8. מצא משתמשים עם חשבוניות אבל בלי subscriptions
    try {
      // קבל את כל המשתמשים שיש להם חשבוניות ששולמו
      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .select("user_id")
        .eq("status", "paid");
      
      console.log("📄 Invoices found:", invoices);
      
      if (!invError && invoices) {
        // קבל את כל המשתמשים שיש להם subscription
        const { data: subs, error: subsError } = await supabase
          .from("subscriptions")
          .select("user_id");
        
        console.log("📋 Subscriptions found:", subs);
        
        // מצא user_ids שיש להם invoice אבל אין subscription
        const userIdsWithSubs = new Set(subs?.map((s: any) => s.user_id) || []);
        const userIdsNeedingSub = [...new Set(
          invoices
            .map((inv: any) => inv.user_id)
            .filter((uid: string) => !userIdsWithSubs.has(uid))
        )];
        
        console.log("🔍 User IDs needing subscription:", userIdsNeedingSub);
        
        // שלוף את פרטי המשתמשים האלה
        if (userIdsNeedingSub.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from("users")
            .select("id, full_name, email")
            .in("id", userIdsNeedingSub);
          
          console.log("👥 Users details:", users);
          
          if (!usersError && users) {
            setUsersWithoutSub(users || []);
            
            diagnostics.push({
              name: "⚠️ משתמשים עם חשבוניות אבל בלי subscription",
              status: "warning",
              message: `${users.length} משתמשים צריכים subscription`,
              details: users,
            });
          }
        } else {
          setUsersWithoutSub([]);
          console.log("✅ כל המשתמשים עם חשבוניות כבר יש להם subscription");
        }
      }
    } catch (err: any) {
      console.error("Error checking users without subscriptions:", err);
    }

    setResults(diagnostics);
    setLoading(false);
  };

  const createSubscriptionForUser = async (userId: string, userName: string) => {
    if (!confirm(`האם ליצור subscription עבור ${userName}?`)) {
      return;
    }

    setCreatingSubscription(true);

    try {
      const response = await fetch("/api/admin/create-manual-subscription-payplus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          plan_id: "basic",
          amount: 1,
          billing_cycle: "monthly",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Subscription נוצר בהצלחה עבור ${userName}!`);
        runDiagnostics(); // רענן את הבדיקות
      } else {
        alert(`❌ שגיאה: ${result.error}`);
      }
    } catch (err: any) {
      alert(`❌ שגיאה: ${err.message}`);
    }

    setCreatingSubscription(false);
  };

  const sendTestWebhook = async () => {
    if (!testUserId) {
      alert("אנא הזן User ID");
      return;
    }

    setSendingTest(true);

    const payload = testWebhookData ? JSON.parse(testWebhookData) : {
      source: "zapier",
      transaction_uid: `test-${Date.now()}`,
      customer_uid: testUserId,
      recurring_uid: `rec-test-${Date.now()}`,
      amount: 1,
      status_code: "000",
      more_info: `${testUserId}|recurring|monthly`,
    };

    try {
      const response = await fetch("/api/webhooks/payplus/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      alert(
        response.ok 
          ? `✅ Webhook הצליח!\n\n${JSON.stringify(result, null, 2)}`
          : `❌ Webhook נכשל!\n\n${JSON.stringify(result, null, 2)}`
      );
    } catch (err: any) {
      alert(`❌ שגיאה: ${err.message}`);
    }

    setSendingTest(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">דיאגנוסטיקה PayPlus + Zapier</h1>
                <p className="text-slate-600">בדיקת מצב המערכת וחיבורים</p>
              </div>
            </div>
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              רענן בדיקות
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="grid gap-4 mb-6">
          {results.map((result, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow border border-slate-100 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {result.status === "success" && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  {result.status === "warning" && (
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  )}
                  {result.status === "error" && (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{result.name}</h3>
                  <p className="text-slate-600 text-sm">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-blue-600 text-sm hover:underline">
                        פרטים נוספים
                      </summary>
                      <pre className="mt-2 p-3 bg-slate-50 rounded text-xs overflow-auto max-h-64">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Users Without Subscriptions */}
        {usersWithoutSub.length > 0 && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              🚨 משתמשים ללא Subscription
            </h2>
            <p className="text-orange-700 mb-4">
              נמצאו {usersWithoutSub.length} משתמשים עם חשבוניות ששולמו אבל אין להם subscription במערכת.
              <br />
              <strong>זו הסיבה שה-webhook לא עובד!</strong> צריך ליצור subscription עבור כל אחד מהם.
            </p>
            
            <div className="space-y-3">
              {usersWithoutSub.map((user: any) => (
                <div key={user.id} className="bg-white border border-orange-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{user.full_name || "ללא שם"}</h3>
                    <p className="text-sm text-slate-600">{user.email}</p>
                    <p className="text-xs text-slate-500 mt-1">ID: {user.id}</p>
                  </div>
                  <button
                    onClick={() => createSubscriptionForUser(user.id, user.full_name || user.email)}
                    disabled={creatingSubscription}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-l from-green-600 to-emerald-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    {creatingSubscription ? "יוצר..." : "צור Subscription"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Webhook */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">🧪 בדיקת Webhook ידנית</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                User ID (UUID)
              </label>
              <input
                type="text"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Webhook Data (JSON) - אופציונלי
              </label>
              <textarea
                value={testWebhookData}
                onChange={(e) => setTestWebhookData(e.target.value)}
                placeholder='{"source": "zapier", "transaction_uid": "test-123", ...}'
                rows={6}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                השאר ריק לשימוש בנתונים דיפולטיים
              </p>
            </div>

            <button
              onClick={sendTestWebhook}
              disabled={sendingTest || !testUserId}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-green-600 to-emerald-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${sendingTest ? "animate-pulse" : ""}`} />
              {sendingTest ? "שולח..." : "שלח Webhook טסט"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
