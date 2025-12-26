import DashboardSidebar from "@/components/DashboardSidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { hasActiveSubscription } from "@/middleware/checkSubscription";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const isAdmin = session?.user?.role === "admin";
  
  // בדיקת subscription רק עבור משתמשים רגילים (לא אדמינים)
  if (!isAdmin && session?.user?.email) {
    const { data: user } = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/user/check-subscription`,
      {
        headers: { 
          'Content-Type': 'application/json',
          'x-user-email': session.user.email 
        },
        cache: 'no-store'
      }
    ).then(res => res.json()).catch(() => ({ data: null }));
    
    // אם אין subscription פעיל - הפנה לדף מיוחד
    if (!user?.hasActiveSubscription) {
      redirect('/dashboard/no-subscription');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <DashboardSidebar isAdmin={isAdmin} />
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
