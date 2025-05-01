'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import CameraCard from '@/components/CameraCard';
import PlanCard from '@/components/PlanCard';
import SupportCard from '@/components/SupportCard';
import DownloadCard from '@/components/DownloadCard';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [cameras, setCameras] = useState<any[]>([]);

  useEffect(() => {
    const fetchCameras = async () => {
      if (!session?.user?.access_token) return;

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${session.user.access_token}`,
            },
          },
        }
      );

      const { data } = await supabase
        .from('cameras')
        .select('*')
        .eq('user_email', session.user.email);

      if (data) setCameras(data);
    };

    fetchCameras();
  }, [session]);

  return (
<main className="min-h-screen pt-24 px-6 space-y-10 bg-gray-50">
<h1 className="text-3xl font-bold">👋 Welcome to ClearPoint</h1>

      {/* Cameras Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">📷 My Cameras</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
  {cameras.map((camera) => (
    <CameraCard key={camera.id} camera={camera} />
  ))}
</div>
      </section>

      {/* Subscription Plan */}
      <PlanCard />

      {/* Support / AI Help */}
      <SupportCard />

      {/* Download / Save */}
      <DownloadCard />
    </main>
  );
}
