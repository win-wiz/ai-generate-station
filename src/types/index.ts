import type { User, Session } from 'next-auth';

// 基础类型定义
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// 用户相关类型
export interface AppUser extends User {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
  emailVerified?: Date | null;
  password?: string | null;
  loginFailedCount: number;
  lastLoginFailedAt?: Date | null;
  lockedUntil?: Date | null;
}

export interface AppSession extends Session {
  user: AppUser;
}

// AI 生成任务类型
export type TaskType = 'text' | 'image' | 'code' | 'translation' | 'summary';
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface AIGenerationTask extends BaseEntity {
  userId: string;
  taskType: TaskType;
  prompt: string;
  result?: string | null;
  status: TaskStatus;
  metadata?: Record<string, unknown> | null;
  completedAt?: Date | null;
}

// 用户偏好设置类型
export type Theme = 'light' | 'dark' | 'system';
export type Language = 'zh-CN' | 'en-US' | 'ja-JP';
export type AIModel = 'gpt-3.5-turbo' | 'gpt-4' | 'claude-3' | 'gemini-pro';

export interface UserPreferences extends BaseEntity {
  userId: string;
  theme: Theme;
  language: Language;
  aiModel: AIModel;
  settings?: Record<string, unknown> | null;
}

// 文章/内容类型
export type PostStatus = 'draft' | 'published' | 'archived';

export interface Post extends BaseEntity {
  title: string;
  content?: string | null;
  status: PostStatus;
  slug?: string | null;
  tags?: string[] | null;
  createdById: string;
  publishedAt?: Date | null;
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

// 请求配置类型
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  [key: string]: any;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 表单类型
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData extends LoginFormData {
  name: string;
  confirmPassword: string;
}

// 错误类型
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

// 路由类型
export enum RouteType {
  PUBLIC = 'public',
  AUTH = 'auth',
  PROTECTED = 'protected',
}

// 性能监控类型
export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  cls?: number; // Cumulative Layout Shift
  fid?: number; // First Input Delay
  ttfb?: number; // Time to First Byte
}

// 组件 Props 类型
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingProps extends BaseComponentProps {
  isLoading: boolean;
  skeleton?: React.ReactNode;
  message?: string;
}

// OAuth 提供商类型
export type OAuthProvider = 'google' | 'github' | 'discord';

// 环境变量类型
export interface EnvConfig {
  NODE_ENV: 'development' | 'test' | 'production';
  DATABASE_URL: string;
  AUTH_SECRET: string;
  NEXTAUTH_URL?: string;
  JWT_SECRET?: string;
  // OAuth 配置
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  AUTH_GITHUB_ID?: string;
  AUTH_GITHUB_SECRET?: string;
  AUTH_DISCORD_ID?: string;
  AUTH_DISCORD_SECRET?: string;
  // Cloudflare D1 配置
  CLOUDFLARE_D1_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_DATABASE_ID?: string;
}