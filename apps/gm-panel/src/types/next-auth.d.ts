import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: number;
      login: string;
      role: number;
      isStaff: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: number;
    login: string;
    role: number;
    isStaff: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: number;
    login: string;
    role: number;
    isStaff: boolean;
  }
}
