"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowRight, Copy, Check, Loader2, CreditCard } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

export default function CreateSubscriptionPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("150");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, phone")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("שגיאה בטעינת רשימת לקוחות");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPaymentUrl("");

    try {
      const response = await fetch("/api/admin/create-recurring-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          monthlyPrice: parseFloat(monthlyPrice),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create subscription");
      }

      setPaymentUrl(data.paymentUrl);
      setSubscriptionId(data.subscription.id);
    } catch (err: any) {
      setError(err.message || "שגיאה ביצירת הוראת קבע");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            יצירת מנוי חודשי חדש
          </h1>
          <p className="text-gray-600">
            צור הוראת קבע חודשית עבור לקוח קיים במערכת
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                בחר לקוח
              </label>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- בחר לקוח --</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} - {user.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selected User Info */}
            {selectedUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">פרטי הלקוח:</h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>
                    <strong>שם:</strong> {selectedUser.full_name}
                  </p>
                  <p>
                    <strong>אימייל:</strong> {selectedUser.email}
                  </p>
                  <p>
                    <strong>טלפון:</strong> {selectedUser.phone}
                  </p>
                </div>
              </div>
            )}

            {/* Monthly Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                מחיר חודשי (₪)
              </label>
              <input
                type="number"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
                min="1"
                step="0.01"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="150"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !selectedUserId}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  יוצר הוראת קבע...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  צור הוראת קבע
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Payment URL Result */}
        {paymentUrl && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
              <Check className="w-6 h-6" />
              הוראת קבע נוצרה בהצלחה!
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-green-800 mb-2">
                  <strong>מזהה מנוי:</strong> {subscriptionId}
                </p>
                <p className="text-sm text-green-800 mb-2">
                  <strong>מחיר חודשי:</strong> ₪{monthlyPrice}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-green-900 mb-2">
                  לינק לאישור הוראת קבע:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={paymentUrl}
                    readOnly
                    className="flex-1 px-4 py-2 bg-white border border-green-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        הועתק!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        העתק
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 font-semibold mb-2">
                  צעדים הבאים:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-green-700">
                  <li>העתק את הלינק (לחץ על כפתור "העתק")</li>
                  <li>שלח ללקוח דרך WhatsApp / SMS / Email</li>
                  <li>הלקוח ימלא פרטי כרטיס ויאשר</li>
                  <li>הוראת הקבע תתחיל לפעול אוטומטית!</li>
                </ol>
              </div>

              <button
                onClick={() => {
                  setPaymentUrl("");
                  setSelectedUserId("");
                  setMonthlyPrice("150");
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                צור מנוי נוסף
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
