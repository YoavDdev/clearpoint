import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { createClient } from '@supabase/supabase-js';
import { DeleteButton } from './DeleteButton';

type Camera = {
  id: string;
  name: string;
  image_url: string;
  serial_number: string;
  user_id: string;
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
    .select('id, name, image_url, serial_number, user_id');

  if (error) {
    throw new Error('Failed to fetch cameras: ' + error.message);
  }

  return (
    <main className="p-6 ml-64 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Manage Cameras</h1>

      {(!cameras || cameras.length === 0) ? (
        <p>No cameras found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cameras.map((camera) => (
            <div key={camera.id} className="bg-white p-4 rounded-lg shadow-md flex flex-col items-center">
              <h2 className="text-lg font-semibold mb-2 text-center">{camera.name}</h2>
              <img
                src={camera.image_url || "https://placehold.co/400x250?text=No+Image"}
                alt={camera.name}
                className="rounded-md mb-4 object-cover w-full h-48"
              />
              <p className="text-sm text-gray-500 mb-2">Serial: {camera.serial_number}</p>
              <DeleteButton cameraId={camera.id} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
