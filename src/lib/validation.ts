import { z } from 'zod';
import { REGEX_PATTERNS } from './constants';

/**
 * 通用验证 Schema
 */

// 基础字段验证
export const emailSchema = z
  .string()
  .min(1, '邮箱不能为空')
  .email('邮箱格式不正确')
  .max(255, '邮箱长度不能超过255个字符');

export const passwordSchema = z
  .string()
  .min(8, '密码长度至少8位')
  .max(128, '密码长度不能超过128位')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    '密码必须包含至少一个小写字母、一个大写字母和一个数字'
  );

export const nameSchema = z
  .string()
  .min(1, '姓名不能为空')
  .max(50, '姓名长度不能超过50个字符')
  .trim();

export const usernameSchema = z
  .string()
  .min(3, '用户名长度至少3位')
  .max(20, '用户名长度不能超过20位')
  .regex(REGEX_PATTERNS.USERNAME, '用户名只能包含字母、数字、下划线和连字符');

export const phoneSchema = z
  .string()
  .regex(REGEX_PATTERNS.PHONE, '手机号格式不正确')
  .optional();

export const urlSchema = z
  .string()
  .url('URL格式不正确')
  .optional();

// ID 验证
export const idSchema = z
  .string()
  .min(1, 'ID不能为空')
  .or(z.number().int().positive('ID必须是正整数'));

export const uuidSchema = z
  .string()
  .uuid('UUID格式不正确');

// 分页验证
export const paginationSchema = z.object({
  page: z
    .number()
    .int()
    .min(1, '页码必须大于0')
    .default(1),
  limit: z
    .number()
    .int()
    .min(1, '每页数量必须大于0')
    .max(100, '每页数量不能超过100')
    .default(20),
});

/**
 * 认证相关 Schema
 */

// 登录表单
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '密码不能为空'),
  rememberMe: z.boolean().optional(),
});

// 注册表单
export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, '确认密码不能为空'),
    agreeToTerms: z.boolean().refine(val => val === true, {
      message: '必须同意服务条款',
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

// 重置密码
export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const newPasswordSchema = z
  .object({
    token: z.string().min(1, '重置令牌不能为空'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, '确认密码不能为空'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

// 修改密码
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '当前密码不能为空'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, '确认密码不能为空'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: '两次输入的新密码不一致',
    path: ['confirmPassword'],
  })
  .refine(data => data.currentPassword !== data.newPassword, {
    message: '新密码不能与当前密码相同',
    path: ['newPassword'],
  });

/**
 * 用户相关 Schema
 */

// 用户资料更新
export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  avatar: z.string().url('头像URL格式不正确').optional(),
  bio: z.string().max(500, '个人简介不能超过500个字符').optional(),
});

// 用户偏好设置
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.enum(['zh-CN', 'en-US', 'ja-JP']).default('zh-CN'),
  aiModel: z.enum(['gpt-3.5-turbo', 'gpt-4', 'claude-3', 'gemini-pro']).default('gpt-3.5-turbo'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    marketing: z.boolean().default(false),
  }).optional(),
  privacy: z.object({
    profileVisible: z.boolean().default(true),
    activityVisible: z.boolean().default(true),
  }).optional(),
});

/**
 * AI 生成任务相关 Schema
 */

// 创建任务
export const createTaskSchema = z.object({
  taskType: z.enum(['text', 'image', 'code', 'translation', 'summary']),
  prompt: z.string().min(1, '提示词不能为空').max(5000, '提示词不能超过5000个字符'),
  metadata: z.record(z.unknown()).optional(),
});

// 更新任务
export const updateTaskSchema = z.object({
  id: idSchema,
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  result: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// 任务查询
export const taskQuerySchema = z.object({
  userId: z.string().optional(),
  taskType: z.enum(['text', 'image', 'code', 'translation', 'summary']).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ...paginationSchema.shape,
});

/**
 * 内容相关 Schema
 */

// 创建文章
export const createPostSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符'),
  content: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  slug: z.string().regex(REGEX_PATTERNS.SLUG, 'URL别名格式不正确').optional(),
  tags: z.array(z.string().max(50, '标签长度不能超过50个字符')).max(10, '标签数量不能超过10个').optional(),
});

// 更新文章
export const updatePostSchema = createPostSchema.partial().extend({
  id: idSchema,
});

/**
 * 文件上传相关 Schema
 */

// 文件上传
export const fileUploadSchema = z.object({
  file: z.instanceof(File, { message: '请选择文件' }),
  type: z.enum(['avatar', 'document', 'image']),
}).refine(data => {
  const maxSizes = {
    avatar: 5 * 1024 * 1024, // 5MB
    document: 10 * 1024 * 1024, // 10MB
    image: 20 * 1024 * 1024, // 20MB
  };
  return data.file.size <= maxSizes[data.type];
}, {
  message: '文件大小超出限制',
  path: ['file'],
});

/**
 * API 响应 Schema
 */

// 成功响应
export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
  });

// 错误响应
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

// 分页响应
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().min(1),
      limit: z.number().int().min(1),
      total: z.number().int().min(0),
      totalPages: z.number().int().min(0),
    }),
  });

/**
 * 验证工具函数
 */

// 安全解析
export function safeParseSchema<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

// 格式化验证错误
export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  error.errors.forEach(err => {
    const path = err.path.join('.');
    formatted[path] = err.message;
  });
  
  return formatted;
}

// 验证中间件类型
export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
};

// 创建验证函数
export function createValidator<T extends z.ZodTypeAny>(schema: T) {
  return (data: unknown): ValidationResult<z.infer<T>> => {
    const result = safeParseSchema(schema, data);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { 
        success: false, 
        errors: formatValidationErrors(result.errors) 
      };
    }
  };
}

// 常用验证器
export const validators = {
  login: createValidator(loginSchema),
  register: createValidator(registerSchema),
  updateProfile: createValidator(updateProfileSchema),
  userPreferences: createValidator(userPreferencesSchema),
  createTask: createValidator(createTaskSchema),
  updateTask: createValidator(updateTaskSchema),
  createPost: createValidator(createPostSchema),
  updatePost: createValidator(updatePostSchema),
  pagination: createValidator(paginationSchema),
};