'use client';

import type { Session } from 'next-auth';

/**
 * 会话缓存管理器
 * 减少频繁的 API 调用，提升性能
 */
class SessionCache {
  private cache: Session | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
  private readonly REFRESH_THRESHOLD = 2 * 60 * 1000; // 2分钟刷新阈值
  private fetchPromise: Promise<Session | null> | null = null;

  /**
   * 获取缓存的会话数据
   */
  getCachedSession(): Session | null {
    const now = Date.now();
    
    // 如果缓存未过期，直接返回
    if (this.cache && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.cache;
    }
    
    return null;
  }

  /**
   * 设置会话缓存
   */
  setCachedSession(session: Session | null): void {
    this.cache = session;
    this.lastFetch = Date.now();
  }

  /**
   * 检查是否需要刷新会话
   */
  shouldRefresh(): boolean {
    const now = Date.now();
    return (now - this.lastFetch) > this.REFRESH_THRESHOLD;
  }

  /**
   * 获取会话数据（带缓存）
   */
  async getSession(): Promise<Session | null> {
    // 检查缓存
    const cached = this.getCachedSession();
    if (cached && !this.shouldRefresh()) {
      return cached;
    }

    // 防止重复请求
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // 发起新请求
    this.fetchPromise = this.fetchSessionFromAPI();
    
    try {
      const session = await this.fetchPromise;
      this.setCachedSession(session);
      return session;
    } finally {
      this.fetchPromise = null;
    }
  }

  /**
   * 从API获取会话数据
   */
  private async fetchSessionFromAPI(): Promise<Session | null> {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Session fetch failed: ${response.status}`);
      }

      const session = await response.json();
      return session || null;
    } catch (error) {
      console.error('Failed to fetch session:', error);
      return null;
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache = null;
    this.lastFetch = 0;
    this.fetchPromise = null;
  }

  /**
   * 强制刷新会话
   */
  async refreshSession(): Promise<Session | null> {
    this.clearCache();
    return this.getSession();
  }
}

// 全局会话缓存实例
export const sessionCache = new SessionCache();

/**
 * 优化的会话Hook
 */
export function useOptimizedSession() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [status, setStatus] = React.useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  React.useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        // 先尝试获取缓存
        const cachedSession = sessionCache.getCachedSession();
        if (cachedSession && mounted) {
          setSession(cachedSession);
          setStatus('authenticated');
        }

        // 获取最新会话数据
        const currentSession = await sessionCache.getSession();
        
        if (mounted) {
          setSession(currentSession);
          setStatus(currentSession ? 'authenticated' : 'unauthenticated');
        }
      } catch (error) {
        console.error('Session loading error:', error);
        if (mounted) {
          setSession(null);
          setStatus('unauthenticated');
        }
      }
    };

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  const refreshSession = React.useCallback(async () => {
    setStatus('loading');
    try {
      const newSession = await sessionCache.refreshSession();
      setSession(newSession);
      setStatus(newSession ? 'authenticated' : 'unauthenticated');
    } catch (error) {
      console.error('Session refresh error:', error);
      setSession(null);
      setStatus('unauthenticated');
    }
  }, []);

  return {
    data: session,
    status,
    refresh: refreshSession,
  };
}

import React from 'react';