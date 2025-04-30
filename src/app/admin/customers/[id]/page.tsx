import { supabaseAdmin } from '@/libs/supabaseAdmin';
import { notFound } from 'next/navigation';

export default async function CustomerViewPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (!user || error) {
    console.error(error);
    return notFound();
  }

  return (
    <div className="p-6 pt-20 max-w-2xl mx-auto bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-right">פרטי לקוח</h1>

      <div className="bg-white rounded-lg shadow-md p-6 text-right space-y-4">
        <div>
          <span className="font-medium text-gray-600">שם מלא:</span>
          <p>{user.full_name || '-'}</p>
        </div>
        <div>
          <span className="font-medium text-gray-600">אימייל:</span>
          <p>{user.email}</p>
        </div>
        <div>
          <span className="font-medium text-gray-600">טלפון:</span>
          <p>{user.phone || '-'}</p>
        </div>
        <div>
          <span className="font-medium text-gray-600">כתובת:</span>
          <p>{user.address || '-'}</p>
        </div>
        <div>
          <span className="font-medium text-gray-600">מסלול מנוי:</span>
          <p>{user.subscription_plan || '-'}</p>
        </div>
        <div>
          <span className="font-medium text-gray-600">הערות:</span>
          <p>{user.notes || '-'}</p>
        </div>
      </div>
    </div>
  );
}
