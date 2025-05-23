"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.ok) {
      router.push("/dashboard");
    } else {
      alert("Login failed");
    }
  }

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-2 bg-white rounded-lg shadow-lg overflow-hidden max-w-4xl w-full">
        <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-[#6F3421] to-[#833414] text-white p-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">ברוך הבא</h2>
            <p className="text-lg">היכנס עם גוגל או עם הדוא"ל והסיסמה שלך</p>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-6 justify-center">
          <h2 className="text-2xl font-bold text-right">כניסה למערכת</h2>

          <button
            onClick={handleGoogleSignIn}
            className="flex items-center justify-center gap-2 border p-2 rounded hover:bg-gray-100"
          >
            <FcGoogle size={24} /> התחברות עם Google
          </button>

          <div className="text-center text-gray-500">או</div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
            <input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-2 border rounded text-right"
              required
            />
            <input
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="p-2 border rounded text-right"
              required
            />
            <button type="submit" className="bg-blue-600 text-white p-2 rounded">
              התחבר
            </button>
          </form>

          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 hover:underline text-right"
          >
            שכחת סיסמה?
          </Link>
        </div>
      </div>
    </main>
  );
}