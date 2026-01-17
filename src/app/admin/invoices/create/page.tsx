"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import InvoiceCreator from "@/components/InvoiceCreator";
import { FileText, User, ArrowLeft, Loader2, Search } from "lucide-react";

interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  plan_id: string | null;
}

function CreateInvoiceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preSelectedUserId = searchParams.get("user_id");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (preSelectedUserId && customers.length > 0) {
      const customer = customers.find((c) => c.id === preSelectedUserId);
      if (customer) {
        setSelectedCustomer(customer);
      }
    }
  }, [preSelectedUserId, customers]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/admin-get-users");
      const data = await response.json();
      
      if (data.success && data.users) {
        setCustomers(data.users);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.full_name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.includes(searchTerm)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">טוען לקוחות...</p>
        </div>
      </div>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-right">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">
                צור חשבונית חדשה
              </h1>
              <p className="text-slate-600">
                בחר לקוח והכן חשבונית / הצעת מחיר מפורטת
              </p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <FileText size={32} className="text-white" />
            </div>
          </div>

          {/* Navigation */}
          <Link
            href="/admin/invoices"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>חזרה לרשימת חשבוניות</span>
          </Link>
        </div>

        {/* Customer Selection */}
        {!selectedCustomer ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800 mb-2 flex items-center gap-2 justify-end">
                <span>בחר לקוח</span>
                <User className="text-blue-600" size={24} />
              </h2>
              <p className="text-slate-600 text-sm">
                חפש ובחר את הלקוח עבורו ברצונך ליצור חשבונית
              </p>
            </div>

            <div className="p-6">
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="חפש לפי שם, אימייל או טלפון..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Customers List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    {searchTerm ? "לא נמצאו לקוחות התואמים לחיפוש" : "אין לקוחות במערכת"}
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className="w-full text-right p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800 group-hover:text-blue-700">
                            {customer.full_name || customer.email}
                          </h3>
                          <p className="text-sm text-slate-600">{customer.email}</p>
                          {customer.phone && (
                            <p className="text-sm text-slate-500">{customer.phone}</p>
                          )}
                        </div>
                        {!customer.plan_id && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                            אין תוכנית
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Selected Customer Banner */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                    <User size={24} className="text-white" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-lg font-semibold text-slate-800">
                      {selectedCustomer.full_name || selectedCustomer.email}
                    </h3>
                    <p className="text-sm text-slate-600">{selectedCustomer.email}</p>
                    {selectedCustomer.phone && (
                      <p className="text-sm text-slate-500">{selectedCustomer.phone}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
                >
                  שנה לקוח
                </button>
              </div>
            </div>

            {/* Invoice Creator */}
            <InvoiceCreator
              userId={selectedCustomer.id}
              customerName={selectedCustomer.full_name || selectedCustomer.email}
              customerEmail={selectedCustomer.email}
            />
          </>
        )}
      </div>
    </main>
  );
}

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">טוען...</p>
        </div>
      </div>
    }>
      <CreateInvoiceContent />
    </Suspense>
  );
}
