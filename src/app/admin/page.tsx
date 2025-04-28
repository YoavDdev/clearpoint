import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'Admin') {
    redirect('/dashboard');
  }

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-6">Welcome to Admin Dashboard</h1>
      {/* Your real Admin content here */}
    </main>
  );
}
