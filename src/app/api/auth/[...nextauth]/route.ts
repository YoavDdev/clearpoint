import NextAuth, { type NextAuthOptions, type User, type Session } from "next-auth";
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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Step 1: Log into Supabase Auth directly
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error("❌ Supabase login failed:", data);
          return null;
        }

        // Step 2: Fetch user role from Supabase 'users' table
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('role')
          .eq('email', credentials.email)
          .single();

        if (userError) {
          console.error('❌ Failed to fetch user role:', userError);
          return null;
        }

        // Step 3: Return user + access token + role
        return {
          id: data.user.id,
          email: data.user.email,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          role: userData?.role || 'user', // Default fallback role
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
        token.role = user.role; // ✅ Save role in token
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        // @ts-ignore
        session.user.access_token = token.access_token;
        // @ts-ignore
        session.user.role = token.role; // ✅ Attach role to session
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
