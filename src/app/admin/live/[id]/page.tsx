"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import LiveStreamPlayer from "@/components/LiveStreamPlayer";

export default function LiveStreamPage() {
  const { data: session, status } = useSession();
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "Admin") {
      router.replace("/"); // 🔒 redirect non-admins to homepage
    }
  }, [session, status, router]);

  if (status === "loading" || !id || typeof id !== "string") {
    return <p className="text-white text-center mt-10">טוען...</p>;
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black p-6">
      <h1 className="text-white text-2xl mb-4">צפייה בשידור חי</h1>
      <div className=" max-w-5xl rounded-xl overflow-hidden shadow-lg border border-gray-700">
  <LiveStreamPlayer path={id} />


      </div>
    </main>
  );
}
