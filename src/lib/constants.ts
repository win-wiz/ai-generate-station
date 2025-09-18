/**
 * 应用常量定义
 */

// 路由常量
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  ABOUT: '/about',
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND: '/404',
  ERROR: '/error',
} as const;

// API 路由常量
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/credentials',
    LOGOUT: '/api/auth/signout',
    SESSION: '/api/auth/session',
    CSRF: '/api/csrf',
  },
  USERS: {
    PROFILE: '/api/users/profile',
    PREFERENCES: '/api/users/preferences',
  },
  AI: {
    GENERATE: '/api/ai/generate',
    TASKS: '/api/ai/tasks',
    MODELS: '/api/ai/models',
  },
  HEALTH: '/api/health',
} as const;

// 认证提供商
export const AUTH_PROVIDERS = {
  GOOGLE: 'google',
  GITHUB: 'github',
  DISCORD: 'discord',
  CREDENTIALS: 'credentials',
} as const;

// 任务状态
export const TASK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

// 任务类型
export const TASK_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  CODE: 'code',
  TRANSLATION: 'translation',
  SUMMARY: 'summary',
} as const;

// 主题选项
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

// 语言选项
export const LANGUAGES = {
  ZH_CN: 'zh-CN',
  EN_US: 'en-US',
  JA_JP: 'ja-JP',
} as const;

// AI 模型选项
export const AI_MODELS = {
  GPT_3_5_TURBO: 'gpt-3.5-turbo',
  GPT_4: 'gpt-4',
  CLAUDE_3: 'claude-3',
  GEMINI_PRO: 'gemini-pro',
} as const;

// 文件大小限制
export const FILE_SIZE_LIMITS = {
  AVATAR: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  IMAGE: 20 * 1024 * 1024, // 20MB
} as const;

// 分页配置
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 5,
} as const;

// 缓存键
export const CACHE_KEYS = {
  USER_SESSION: 'user_session',
  USER_PREFERENCES: 'user_preferences',
  AI_MODELS: 'ai_models',
  RECENT_TASKS: 'recent_tasks',
} as const;

// 本地存储键
export const STORAGE_KEYS = {
  THEME: 'app_theme',
  LANGUAGE: 'app_language',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  RECENT_SEARCHES: 'recent_searches',
  DRAFT_CONTENT: 'draft_content',
  ERROR_LOGS: 'app_errors',
} as const;

// 错误代码
export const ERROR_CODES = {
  // 认证错误
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // 验证错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // 业务错误
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  
  // 系统错误
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // 限流错误
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
} as const;

// HTTP 状态码
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// 正则表达式
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE: /^1[3-9]\d{9}$/,
  URL: /^https?:\/\/.+/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
} as const;

// 时间常量（毫秒）
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

// 动画持续时间
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
} as const;

// 断点配置
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// 性能阈值
export const PERFORMANCE_THRESHOLDS = {
  FCP: 1800, // First Contentful Paint
  LCP: 2500, // Largest Contentful Paint
  CLS: 0.1,  // Cumulative Layout Shift
  FID: 100,  // First Input Delay
  TTFB: 600, // Time to First Byte
} as const;

// 环境配置
export const ENV = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

// API 配置
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  TIMEOUT: 30000, // 30秒
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1秒
} as const;

// 默认配置
export const DEFAULT_CONFIG = {
  THEME: THEMES.SYSTEM,
  LANGUAGE: LANGUAGES.ZH_CN,
  AI_MODEL: AI_MODELS.GPT_3_5_TURBO,
  PAGE_SIZE: PAGINATION.DEFAULT_PAGE_SIZE,
  SESSION_TIMEOUT: 7 * TIME_CONSTANTS.DAY, // 7天
  RETRY_ATTEMPTS: 3,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 1000,
} as const;

// 功能标志
export const FEATURE_FLAGS = {
  ENABLE_DARK_MODE: true,
  ENABLE_ANALYTICS: true,
  ENABLE_ERROR_REPORTING: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_OFFLINE_MODE: false,
  ENABLE_PWA: false,
} as const;