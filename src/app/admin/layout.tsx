import Sidebar from '@/components/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-12 flex-1 p-8 bg-gray-100 min-h-screen">
        {children}
      </main>
    </div>
  );
}
