import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ClientSidebar from "@/components/ClientSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "Admin") {
    redirect("/dashboard");
  }

  return <ClientSidebar>{children}</ClientSidebar>; // ✅ no <Sidebar /> here!
}
