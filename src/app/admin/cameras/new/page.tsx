'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Camera,
  User,
  Hash,
  Wifi,
  Eye,
  EyeOff,
  Monitor,
  Settings,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Copy,
} from 'lucide-react';

const Select = dynamic(() => import('react-select'), { ssr: false });

export default function NewCameraPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userCameras, setUserCameras] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [isStreamActive, setIsStreamActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const response = await fetch('/api/admin-get-users');
        const result = await response.json();

        if (!response.ok) {
          console.error('❌ Failed to fetch users:', result.error);
          return;
        }

        setUsers(result.users || []);
      } catch (err) {
        console.error('❌ Unexpected error fetching users:', err);
      } finally {
        setLoading(false);
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

    try {
      const res = await fetch('/api/admin-fetch-cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: option.value }),
      });

      const result = await res.json();

      if (!result.success) {
        console.error('Error fetching cameras:', result.error);
        setUserCameras([]);
      } else {
        setUserCameras(result.cameras || []);
      }
    } catch (error) {
      console.error('Failed to fetch user cameras:', error);
      setUserCameras([]);
    }
  }

  async function handleCreateCamera() {
    if (!selectedUser) {
      alert('יש לבחור משתמש קודם');
      return;
    }

    if (!name || !serialNumber || !username || !password || !ipAddress) {
      alert('נא למלא את כל השדות');
      return;
    }

    const streamPath = `rtsp://${username}:${password}@${ipAddress}:554/h264/ch1/main/av_stream`;

    setLoading(true);

    try {
      const response = await fetch('/api/admin-create-camera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          serialNumber,
          userId: selectedUser.value,
          userEmail: selectedUser.email,
          streamPath,
          isStreamActive,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error('Error creating camera:', result.error);
        alert('יצירת המצלמה נכשלה: ' + result.error);
      } else {
        // Copy camera ID to clipboard
        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(result.camera.id);
          } catch (clipboardError) {
            console.warn('Failed to copy to clipboard:', clipboardError);
          }
        }
        
        alert(`✅ מצלמה נוצרה בהצלחה!\n\nשם: ${result.camera.name}\nמספר סידורי: ${result.camera.serial_number}\nID: ${result.camera.id}`);
        
        // Reset form
        setName('');
        setSerialNumber('');
        setUsername('admin');
        setPassword('');
        setIpAddress('');
        setIsStreamActive(true);
        
        // Refresh user cameras list
        if (selectedUser) {
          handleUserSelect(selectedUser);
        }
      }
    } catch (error) {
      console.error('Failed to create camera:', error);
      alert('שגיאה ביצירת המצלמה. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  }

  const userOptions = users.map(user => ({
    value: user.id,
    label: user.full_name ? `${user.full_name} (${user.email})` : user.email,
    email: user.email,
  }));

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-right">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">הוספת מצלמה חדשה</h1>
              <p className="text-slate-600">הוספת מצלמת אבטחה חדשה למערכת</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <Camera size={32} className="text-white" />
            </div>
          </div>
          
          {/* Navigation */}
          <div className="mb-6">
            <Link
              href="/admin/cameras"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>חזרה לרשימת המצלמות</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 text-right">פרטי המצלמה החדשה</h2>
            <p className="text-slate-600 text-right mt-1">מלא את כל הפרטים הנדרשים להוספת מצלמה</p>
          </div>

          <div className="p-8">

            {/* User Selection */}
            <div className="mb-8">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 justify-end">
                  <span>בחירת לקוח</span>
                  <User className="text-blue-600" size={20} />
                </h3>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                  <span>שייך למשתמש (שם מלא + אימייל) *</span>
                  <User size={16} className="text-slate-400" />
                </label>
                <div className="relative">
                  <Select
                    options={userOptions}
                    value={selectedUser}
                    onChange={handleUserSelect}
                    isSearchable
                    placeholder="חפש ובחר משתמש..."
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: '4px',
                        borderRadius: '8px',
                        borderColor: '#cbd5e1',
                        '&:hover': { borderColor: '#10b981' },
                        '&:focus-within': { 
                          borderColor: '#10b981',
                          boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)'
                        }
                      }),
                      placeholder: (base) => ({
                        ...base,
                        textAlign: 'right',
                        direction: 'rtl'
                      }),
                      singleValue: (base) => ({
                        ...base,
                        textAlign: 'right',
                        direction: 'rtl'
                      })
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Existing Cameras */}
            {userCameras.length > 0 && (
              <div className="mb-8 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 justify-end mb-3">
                  <span className="font-semibold text-amber-800">מצלמות קיימות של המשתמש</span>
                  <Camera size={16} className="text-amber-600" />
                </div>
                <div className="space-y-2">
                  {userCameras.map((camera) => (
                    <div key={camera.id} className="flex items-center gap-2 justify-end text-sm text-amber-800">
                      <span>{camera.name} (סידורי: {camera.serial_number})</span>
                      <Monitor size={14} className="text-amber-600" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Camera Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Left Column - Basic Info */}
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 justify-end">
                    <span>פרטי מצלמה בסיסיים</span>
                    <Camera className="text-purple-600" size={20} />
                  </h3>
                </div>

                {/* Camera Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>שם מצלמה *</span>
                    <Camera size={16} className="text-slate-400" />
                  </label>
                  <input
                    type="text"
                    placeholder="מצלמה ראשית, מצלמת כניסה..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* Serial Number */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>מספר סידורי *</span>
                    <Hash size={16} className="text-slate-400" />
                  </label>
                  <input
                    type="text"
                    placeholder="ABC123456789"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Right Column - RTSP Settings */}
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 justify-end">
                    <span>הגדרות RTSP</span>
                    <Settings className="text-green-600" size={20} />
                  </h3>
                </div>

                {/* IP Address */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                    <span>כתובת IP *</span>
                    <Wifi size={16} className="text-slate-400" />
                  </label>
                  <input
                    type="text"
                    placeholder="192.168.1.10"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                  />
                </div>

                {/* Username & Password */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                      <span>סיסמה *</span>
                      <Eye size={16} className="text-slate-400" />
                    </label>
                    <input
                      type="text"
                      placeholder="123456"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 text-right flex items-center gap-2 justify-end">
                      <span>שם משתמש *</span>
                      <User size={16} className="text-slate-400" />
                    </label>
                    <input
                      type="text"
                      placeholder="admin"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stream Settings */}
            <div className="mb-8">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                <div className="text-right">
                  <h4 className="font-semibold text-green-800">סטרים פעיל</h4>
                  <p className="text-sm text-green-600">האם המצלמה תהיה פעילה מיד</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isStreamActive}
                      onChange={(e) => setIsStreamActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                  {isStreamActive ? (
                    <Eye size={20} className="text-green-600" />
                  ) : (
                    <EyeOff size={20} className="text-slate-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-slate-200">
              <div className="flex items-center gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>ביטול</span>
                </button>
                
                <button
                  onClick={handleCreateCamera}
                  disabled={loading || !selectedUser || !name || !serialNumber || !username || !password || !ipAddress}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>יוצר מצלמה...</span>
                    </>
                  ) : (
                    <>
                      <Camera size={16} />
                      <span>צור מצלמה חדשה</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Required fields note */}
              <div className="mt-4 flex items-center gap-2 justify-end text-sm text-slate-600">
                <span>שדות חובה מסומנים ב-*</span>
                <AlertCircle size={16} className="text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}