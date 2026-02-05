import { Suspense } from 'react';

import NewCameraPageClient from './NewCameraPageClient';

export default function NewCameraPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" />}>
      <NewCameraPageClient />
    </Suspense>
  );
}