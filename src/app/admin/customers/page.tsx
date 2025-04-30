"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/libs/supabaseClient';
import Link from 'next/link';

interface Customer {
  id: string;
  email: string;
  full_name: string;
  subscription_plan: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchCustomers() {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, subscription_plan');

      if (error) {
        console.error('Error fetching customers:', error);
      } else {
        setCustomers(data || []);
      }
      setLoading(false);
    }

    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((customer) => {
    const searchText = search.toLowerCase();
    return (
      customer.full_name?.toLowerCase().includes(searchText) ||
      customer.email?.toLowerCase().includes(searchText)
    );
  });

  return (
    <main className="pt-20 p-6 bg-gray-100 min-h-screen">
      {/* Title and counter */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold">ניהול לקוחות</h1>
        <span className="text-sm text-gray-500">{customers.length} לקוחות במערכת</span>
      </div>

      {/* Search and add button on same row under title */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <input
          type="text"
          placeholder="חיפוש לפי שם או אימייל..."
          className="w-full max-w-sm p-2 border rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        
        <Link
          href="/admin/customers/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          הוספת לקוח חדש
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg shadow bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 text-right">
            <tr>
              <th className="px-4 py-3 text-sm font-semibold text-gray-700">אימייל</th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-700">שם מלא</th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-700">מסלול</th>
              <th className="px-4 py-3 text-sm font-semibold text-center text-gray-700">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500">
                  טוען נתונים...
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500">
                  לא נמצאו לקוחות.
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 text-sm">
                  <td className="px-4 py-3">{customer.email}</td>
                  <td className="px-4 py-3">{customer.full_name || '-'}</td>
                  <td className="px-4 py-3">{customer.subscription_plan || '-'}</td>
                  <td className="px-4 py-3 text-center">
  <Link href={`/admin/customers/${customer.id}`}>
    <span className="text-blue-600 hover:underline mx-1 cursor-pointer">צפייה</span>
  </Link>
  <Link href={`/admin/customers/${customer.id}/edit`}>
    <span className="text-green-600 hover:underline mx-1 cursor-pointer">עריכה</span>
  </Link>
  <button
    onClick={async () => {
      const confirmDelete = confirm('למחוק את המשתמש?');
      if (!confirmDelete) return;

      const response = await fetch('/api/admin-delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: customer.id }),
      });

      const result = await response.json();
      if (!result.success) {
        alert('שגיאה במחיקה: ' + result.error);
      } else {
        alert('המשתמש נמחק בהצלחה');
        location.reload();
      }
    }}
    className="text-red-600 hover:underline mx-1"
  >
    מחיקה
  </button>
</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
