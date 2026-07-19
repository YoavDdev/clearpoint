"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Component to handle auth redirects when tokens arrive in URL hash
 * This is a fallback for when Supabase redirects to homepage instead of /auth/callback
 */
export default function AuthRedirectHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthRedirect = async () => {
      // Check if we have auth tokens in the URL hash
      const hash = window.location.hash;
      if (!hash) return;

      // Handle error redirects (e.g. expired invite link)
      if (hash.includes("error=")) {
        const hashParams = new URLSearchParams(hash.slice(1));
        const errorCode = hashParams.get("error_code");
        if (errorCode === "otp_expired") {
          router.push("/login?error=הקישור+פג+תוקף.+אנא+פנה+למשרד+לקבלת+קישור+חדש.");
        } else {
          router.push("/login?error=הקישור+אינו+תקין.+אנא+פנה+למשרד.");
        }
        return;
      }

      if (!hash.includes("access_token")) {
        return;
      }


      const hashParams = new URLSearchParams(hash.slice(1));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      if (!access_token || !refresh_token) {
        console.warn("⚠️ Incomplete tokens in hash");
        return;
      }

      try {
        const supabase = createClientComponentClient();

        // Set the session from the tokens
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error || !data.session) {
          console.error("❌ Failed to set session:", error);
          router.push("/login?error=קישור_לא_תקין");
          return;
        }


        // If it's an invite link, redirect to setup password
        if (type === "invite" || type === "recovery") {
          router.push("/setup-password");
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("❌ Error processing auth redirect:", err);
        router.push("/login?error=שגיאה_באימות");
      }
    };

    handleAuthRedirect();
  }, [router]);

  // This component doesn't render anything
  return null;
}
