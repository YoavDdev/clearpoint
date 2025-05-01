import NextAuth, { type NextAuthOptions, type User } from "next-auth";
import { type JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Step 1: Login to Supabase Auth
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          }
        );

        const data = await response.json();
        if (!response.ok) {
          console.error("❌ Supabase login failed:", data);
          return null;
        }

        // Step 2: Use access_token to fetch user role via RLS
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${data.access_token}`,
              },
            },
          }
        );

        let { data: userData, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("email", credentials.email)
          .single();

        if (userError?.code === "PGRST116") {
          console.warn("⚠️ User not found. Creating user row...");
          const { error: insertError } = await supabase
            .from("users")
            .insert([{ email: credentials.email, role: "Customer" }]);

          if (insertError) {
            console.error("❌ Failed to insert user row:", insertError);
            return null;
          }

          userData = { role: "Customer" };
        } else if (userError) {
          console.error("❌ Failed to fetch user role:", userError);
          return null;
        }

        console.log("✅ User role:", userData?.role);

        return {
          id: data.user.id,
          email: data.user.email,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          role: userData?.role ?? "Customer", // ✅ fallback if somehow still null
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        // @ts-ignore
        token.access_token = user.access_token;
        // @ts-ignore
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      session.user.id = token.id;
      session.user.email = token.email;
      // @ts-ignore
      session.user.access_token = token.access_token;
      // @ts-ignore
      session.user.role = token.role;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
