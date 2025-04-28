import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { createClient } from '@supabase/supabase-js';
import { DeleteButton } from './DeleteButton';


type Camera = {
    id: string;
    name: string;
    image_url: string;
    user_email: string;
  };

export default async function CamerasPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'Admin') {
    redirect('/dashboard');
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: cameras, error } = await supabaseAdmin
    .from('cameras')
    .select('*');

  if (error) {
    throw new Error('Failed to fetch cameras: ' + error.message);
  }

  async function handleDelete(cameraId: string) {
    const res = await fetch('/api/admin-delete-camera', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cameraId }),
    });

    const result = await res.json();

    if (!result.success) {
      alert('Error deleting camera: ' + result.error);
    } else {
      window.location.reload();
    }
  }

  return (
    <main className="p-6 ml-64">
      <h1 className="text-3xl font-bold mb-6">Manage Cameras</h1>

      {(!cameras || cameras.length === 0) ? (
        <p>No cameras found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cameras.map((camera: Camera) => (
            <div key={camera.id} className="p-4 border rounded shadow">
              <h2 className="text-xl font-semibold">{camera.name}</h2>
              <p className="text-sm text-gray-500">{camera.user_email}</p>
              <img src={camera.image_url || "https://placehold.co/400x250?text=No+Image"} alt={camera.name} className="mt-2 rounded" />

              <DeleteButton cameraId={camera.id} />

            </div>
          ))}
        </div>
      )}
    </main>
  );
}
