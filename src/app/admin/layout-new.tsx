import { ModernAdminSidebar } from "@/components/admin/ModernAdminSidebar";

export default function ModernAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <ModernAdminSidebar />
      
      {/* Main Content */}
      <div className="mr-72">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
