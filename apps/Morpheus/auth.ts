import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { bcryptCompare } from "@/lib/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const creds = credentials as { email?: string; password?: string };
        if (!creds?.email || !creds?.password) {
          throw new Error("Email e senha sao obrigatorios");
        }

        const user = await prisma.user.findUnique({
          where: { email: creds.email },
          include: { tenant: true },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Email ou senha invalidos");
        }

        if (!user.active) {
          throw new Error("Usuario inativo");
        }

        const isPasswordValid = await bcryptCompare(
          creds.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Email ou senha invalidos");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantSlug: user.tenant.slug,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as Record<string, unknown>;
        token.id = u.id as string;
        token.role = u.role as string;
        token.tenantId = u.tenantId as string;
        token.tenantSlug = u.tenantSlug as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantSlug = token.tenantSlug as string;
      }
      return session;
    },
  },
});
