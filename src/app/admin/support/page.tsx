'use client';

import { useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import {
  MessageSquare,
  Mail,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  Paperclip,
  ArrowLeft,
  Tag,
  Eye,
  ExternalLink,
} from "lucide-react";

interface SupportRequest {
  id: string;
  email: string;
  message: string;
  created_at: string;
  is_handled: boolean;
  user_id?: string;
  category?: string;
  file_url?: string;
}

const categoryMap: Record<string, string> = {
  billing: "בקשת תשלום",
  technical: "בעיה טכנית",
  question: "שאלה",
  other: "אחר",
};

export default function AdminSupportPage() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      const res = await fetch("/api/admin-get-support");
      const data = await res.json();
      setRequests(data.requests || []);
      setLoading(false);
    }
    fetchRequests();
  }, []);

  const handleMarkHandled = async (id: string) => {
    await fetch("/api/admin-handle-support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    location.reload();
  };

  const unhandledRequests = requests
    .filter((r) => !r.is_handled)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-right">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">בקשות תמיכה</h1>
              <p className="text-slate-600">ניהול פניות לקוחות ותמיכה טכנית</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <MessageSquare size={32} className="text-white" />
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">סה"כ בקשות</p>
                <p className="text-3xl font-bold text-slate-800">{requests.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <MessageSquare size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">ממתינות לטיפול</p>
                <p className="text-3xl font-bold text-orange-600">{unhandledRequests.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={24} className="text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">בקשות מטופלות</p>
                <p className="text-3xl font-bold text-green-600">
                  {requests.filter(r => r.is_handled).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle size={24} className="text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-600 text-sm font-medium">עם קבצים מצורפים</p>
                <p className="text-3xl font-bold text-purple-600">
                  {requests.filter(r => r.file_url).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Paperclip size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mb-6">
          <Link
            href="/admin/support/handled"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Eye size={16} />
            <span>הצג בקשות שטופלו</span>
          </Link>
        </div>

        {/* Support Requests */}
        {loading ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">טוען בקשות תמיכה...</p>
          </div>
        ) : unhandledRequests.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
            <MessageSquare size={48} className="mx-auto mb-4 text-slate-400" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">אין בקשות תמיכה חדשות</h3>
            <p className="text-slate-600">כל הבקשות החדשות יופיעו כאן</p>
          </div>
        ) : (
          <div className="space-y-6">
            {unhandledRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-2">
                        <span className="text-lg font-semibold text-slate-800">{req.email}</span>
                        <Mail size={20} className="text-slate-600" />
                      </div>
                      <div className="flex items-center gap-2 justify-end text-sm text-slate-600">
                        <span>{format(new Date(req.created_at), "dd/MM/yyyy HH:mm")}</span>
                        <Clock size={16} className="text-slate-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium">
                        <AlertTriangle size={14} />
                        ממתין לטיפול
                      </span>
                      {req.category && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                          <Tag size={14} />
                          {categoryMap[req.category] || req.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-slate-600 mb-2">תוכן הפנייה:</h4>
                    <div className="bg-slate-50 rounded-lg p-4 text-slate-800 leading-relaxed">
                      {req.message}
                    </div>
                  </div>

                  {req.file_url && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-slate-600 mb-2">קובץ מצורף:</h4>
                      <a
                        href={req.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                      >
                        <Paperclip size={16} />
                        <span>הורד קובץ מצורף</span>
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-200">
                    {req.user_id && (
                      <Link
                        href={`/admin/customers/${req.user_id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <User size={16} />
                        <span>צפה בלקוח</span>
                      </Link>
                    )}
                    
                    <button
                      onClick={() => handleMarkHandled(req.id)}
                      className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <CheckCircle size={16} />
                      <span>סמן כמטופל</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
