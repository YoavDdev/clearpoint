import ClientSidebar from "@/components/ClientSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ClientSidebar>{children}</ClientSidebar>;
}
