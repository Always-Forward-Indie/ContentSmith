import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createHash } from 'crypto';
import { db } from '@/server/db';
import { users, userRoles } from '@/db';
import { eq, and } from '@/db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        login: { label: 'Login', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) {
          return null;
        }

        const [user] = await db
          .select({
            id: users.id,
            login: users.login,
            password: users.password,
            role: users.role,
            isActive: users.isActive,
            lockedUntil: users.lockedUntil,
            isStaff: userRoles.isStaff,
          })
          .from(users)
          .leftJoin(userRoles, eq(users.role, userRoles.id))
          .where(eq(users.login, credentials.login))
          .limit(1);

        if (!user) {
          return null;
        }

        if (!user.isActive) {
          throw new Error('Account is deactivated');
        }

        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          throw new Error('Account is temporarily locked');
        }

        const hash = createHash('sha256').update(credentials.password).digest('hex');
        if (hash !== user.password) {
          return null;
        }

        if (!user.isStaff) {
          throw new Error('Insufficient permissions. GM access required.');
        }

        return {
          id: Number(user.id),
          login: user.login,
          role: user.role,
          isStaff: user.isStaff ?? false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as number;
        token.login = user.login;
        token.role = user.role;
        token.isStaff = user.isStaff;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id,
        login: token.login,
        role: token.role,
        isStaff: token.isStaff,
      };
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
