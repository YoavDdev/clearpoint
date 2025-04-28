'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/libs/supabaseClient';

interface Customer {
  id: string;
  email: string;
  full_name: string;
  subscription_plan: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

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

  // ✅ New function to handle Delete
  const handleDelete = async (userId: string) => {
    const confirmDelete = confirm('Are you sure you want to delete this customer?');
  
    if (!confirmDelete) return;
  
    const response = await fetch('/api/admin-delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  
    const result = await response.json();
  
    if (!result.success) {
      alert('Error deleting customer: ' + result.error);
      return;
    }
  
    alert('Customer deleted successfully!');
    
    // Refresh page or refetch customers
    location.reload(); // or better: refetch customers without full reload
  };
  

  return (
    <main className="flex flex-col min-h-screen p-6 ml-64 bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Customers</h1>

      {loading ? (
        <p>Loading customers...</p>
      ) : customers.length === 0 ? (
        <p>No customers found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Full Name</th>
                <th className="px-4 py-2 text-left">Subscription Plan</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-t">
                  <td className="px-4 py-2">{customer.email}</td>
                  <td className="px-4 py-2">{customer.full_name || '-'}</td>
                  <td className="px-4 py-2">{customer.subscription_plan || '-'}</td>
                  <td className="px-4 py-2 text-center">
                    {/* View and Edit buttons can stay for later */}
                    <button className="text-blue-600 hover:underline mr-2">View</button>
                    <button className="text-green-600 hover:underline mr-2">Edit</button>
                    {/* ✅ Delete Button */}
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
