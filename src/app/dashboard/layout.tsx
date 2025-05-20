import MiniNavbar from "@/components/MiniNavbar";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <MiniNavbar />
      <div className="p-6">{children}</div>
    </div>
  );
}
