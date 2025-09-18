import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

import { db } from "@/server/db";
import { env } from "@/env";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/server/db/schema";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    DiscordProvider,
    GoogleProvider({
      clientId: env.AUTH_GOOGLE_ID!,
      clientSecret: env.AUTH_GOOGLE_SECRET!,
    }),
    GitHubProvider({
      clientId: env.AUTH_GITHUB_ID!,
      clientSecret: env.AUTH_GITHUB_SECRET!,
      // 优化GitHub OAuth配置
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
      // 禁用PKCE以解决GitHub OAuth验证问题
      checks: ["state"],
      // 添加超时配置
      httpOptions: {
        timeout: 10000, // 10秒超时
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt" as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    signIn: async ({ user, account, profile, email, credentials }) => {
      console.log('NextAuth signIn callback:', { user, account, profile });
      
      // 检查是否是OAuth错误
      if (account?.error) {
        console.error('OAuth sign-in error:', account.error);
        return false;
      }
      
      // 允许所有OAuth登录
      return true;
    },
    redirect: ({ url, baseUrl }) => {
      console.log('NextAuth redirect callback:', { url, baseUrl });
      
      // 如果是相对路径，拼接 baseUrl
      if (url.startsWith('/')) {
        const fullUrl = `${baseUrl}${url}`;
        console.log('Redirecting to relative path:', fullUrl);
        return fullUrl;
      }
      
      // 如果是同域名的完整 URL，直接返回
      if (url.startsWith(baseUrl)) {
        console.log('Redirecting to same domain URL:', url);
        return url;
      }
      
      // 登录成功后默认重定向到 dashboard
      const dashboardUrl = `${baseUrl}/dashboard`;
      console.log('Redirecting to default dashboard:', dashboardUrl);
      return dashboardUrl;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub,
      },
    }),
    jwt: async ({ token, account, user }) => {
      // 首次登录时保存账户信息
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at;
        token.userId = user.id;
      }

      // 只有在明确设置了过期时间且确实过期时才尝试刷新
      // 对于GitHub等提供商，通常不设置过期时间，令牌是长期有效的
      if (token.accessTokenExpires) {
        const expiresAt = (token.accessTokenExpires as number) * 1000;
        const now = Date.now();
        
        // 如果令牌还没过期，直接返回
        if (now < expiresAt) {
          return token;
        }
        
        // 令牌已过期，尝试刷新
        return await refreshAccessToken(token);
      }

      // 没有设置过期时间，直接返回令牌（适用于GitHub等）
      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
    signOut: '/login',
  },
  debug: false, // 关闭 debug 模式以减少日志输出和重复的会话检查
  // debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;

/**
 * 刷新访问令牌
 */
async function refreshAccessToken(token: any) {
  try {
    // 这里可以根据不同的提供商实现令牌刷新逻辑
    // 对于GitHub，通常不需要刷新令牌，因为它们是长期有效的
    console.log('Token refresh attempted for:', token.userId);
    return token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
