import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const allowedEmail = process.env.ALLOWED_EMAIL;
        const hash = process.env.ADMIN_PASSWORD_HASHED;
        if (!credentials || !allowedEmail || !hash) {
          return null;
        }
        const email = credentials.email?.toString().toLowerCase();

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          hash,
        );
        if (email === allowedEmail.toLowerCase() && isPasswordValid) {
          return { id: "admin", name: "Admin", email: allowedEmail } as any;
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" as const },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token?.email) {
        session.user = { ...(session.user || {}), email: token.email };
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions as any);
export { handler as GET, handler as POST };
