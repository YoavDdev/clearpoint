'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/libs/supabaseClient';
import dynamic from 'next/dynamic';

const Select = dynamic(() => import('react-select'), { ssr: false });

export default function NewCameraPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userCameras, setUserCameras] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email');
      if (data) {
        setUsers(data);
      } else {
        console.error('Error fetching users:', error);
      }
    }
    fetchUsers();
  }, []);

  async function handleUserSelect(option: any) {
    setSelectedUser(option);
  
    if (!option) {
      setUserCameras([]);
      return;
    }
  
    const res = await fetch('/api/admin-fetch-cameras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: option.value }),
    });
  
    const result = await res.json();
  
    if (!result.success) {
      console.error('Error fetching cameras:', result.error);
    } else {
      setUserCameras(result.cameras);
    }
  }
  
  

  async function handleCreateCamera() {
    if (!selectedUser) {
      alert('Please select a user first.');
      return;
    }

    setLoading(true);

    const response = await fetch('/api/admin-create-camera', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        serialNumber,
        userId: selectedUser.value,
        userEmail: selectedUser.email, 
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Error creating camera:', result.error);
      alert('Failed to create camera: ' + result.error);
    } else {
      navigator.clipboard.writeText(result.camera.id);
alert(`✅ Camera created!\n\nID copied to clipboard:\n${result.camera.id}`);
      setName('');
      setImageUrl('');
      setSerialNumber('');
      // Refresh cameras list after adding
      handleUserSelect(selectedUser);
    }

    setLoading(false);
  }

  const userOptions = users.map(user => ({
    value: user.id,
    label: user.full_name ? `${user.full_name} (${user.email})` : user.email,
    email: user.email, // ✅ added
  }));

  return (
    <main className="flex flex-col min-h-screen p-6 bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Add New Camera</h1>

      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full">
        {/* User selection with react-select */}
        <div className="mb-6">
          <label className="block mb-2">Assign to User (Full Name + Email)</label>
          <Select
            options={userOptions}
            value={selectedUser}
            onChange={handleUserSelect}
            isSearchable
            placeholder="Search and select a user..."
          />
        </div>

        {/* Existing Cameras list */}
        {userCameras.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Existing Cameras for this User:</h2>
            <ul className="list-disc pl-6">
              {userCameras.map((camera) => (
                <li key={camera.id} className="mb-1">
                  {camera.name} (Serial: {camera.serial_number})
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* New Camera Form */}
        <div className="mb-4">
          <label className="block mb-2">Camera Name</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        

        <div className="mb-6">
          <label className="block mb-2">Camera Serial Number</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
        </div>

        <button
          onClick={handleCreateCamera}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
        >
          {loading ? 'Creating...' : 'Create Camera'}
        </button>
      </div>
    </main>
  );
}
