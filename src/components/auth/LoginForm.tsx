'use client';

import { useState, useEffect, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ButtonLoading } from '@/components/ui/LoadingStates';
import { EmailUtils, CSRFUtils, SessionUtils } from '@/lib/auth-utils';
import { useLoginFormGuard } from '@/lib/navigation-guard';
import { validators } from '@/lib/validation';
import { cn, debounce } from '@/lib/utils';
import { ROUTES, AUTH_PROVIDERS } from '@/lib/constants';
import type { OAuthProvider, BaseComponentProps } from '@/types';

interface LoginFormProps extends BaseComponentProps {
  mode?: 'login' | 'register';
  onSuccess?: () => void;
  redirectTo?: string;
  showSocialLogin?: boolean;
  autoFocus?: boolean;
}

interface FormData {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

interface FormErrors {
  [key: string]: string;
}

export default function LoginForm({ 
  mode = 'login', 
  onSuccess,
  redirectTo = ROUTES.DASHBOARD,
  showSocialLogin = true,
  autoFocus = true,
  className
}: LoginFormProps) {
  const router = useRouter();
  
  // 状态管理
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [csrfToken, setCsrfToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
    agreeToTerms: false,
  });

  // 路由守卫
  const { isAuthenticated, session } = useLoginFormGuard();

  // 获取CSRF token
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch('/api/csrf');
        const data = await response.json();
        setCsrfToken(data.csrfToken || CSRFUtils.generateToken());
      } catch {
        setCsrfToken(CSRFUtils.generateToken());
      }
    };
    
    fetchCsrfToken();
  }, []);

  // 登录成功处理
  useEffect(() => {
    if (isAuthenticated && session) {
      const targetUrl = redirectTo || ROUTES.DASHBOARD;
      
      if (onSuccess) {
        try {
          onSuccess();
        } catch (error) {
          console.error('onSuccess callback error:', error);
          router.replace(targetUrl);
        }
      } else {
        requestAnimationFrame(() => {
          router.replace(targetUrl);
        });
      }
    }
  }, [isAuthenticated, session, onSuccess, redirectTo, router]);

  // 防抖验证
  const debouncedValidation = useCallback(
    debounce((field: keyof FormData, value: string) => {
      const newErrors = { ...errors };
      
      switch (field) {
        case 'email':
          if (value && !EmailUtils.isValid(value)) {
            newErrors.email = '邮箱格式不正确';
          } else {
            delete newErrors.email;
          }
          break;
        case 'password':
          if (value && value.length < 8) {
            newErrors.password = '密码长度至少8位';
          } else {
            delete newErrors.password;
          }
          break;
        case 'confirmPassword':
          if (!isLogin && value && value !== formData.password) {
            newErrors.confirmPassword = '两次输入的密码不一致';
          } else {
            delete newErrors.confirmPassword;
          }
          break;
      }
      
      setErrors(newErrors);
    }, 300),
    [errors, formData.password, isLogin]
  );

  // 表单字段更新
  const updateFormData = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (typeof value === 'string' && field !== 'name') {
      debouncedValidation(field, value);
    }
  }, [debouncedValidation]);

  // 表单验证
  const validateForm = useCallback((): boolean => {
    if (isLogin) {
      const result = validators.login({ 
        email: formData.email, 
        password: formData.password 
      });
      
      if (!result.success) {
        setErrors(result.errors || {});
        return false;
      }
    } else {
      const result = validators.register(formData);
      
      if (!result.success) {
        setErrors(result.errors || {});
        return false;
      }
    }
    
    setErrors({});
    return true;
  }, [isLogin, formData]);

  // 表单提交
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          action: isLogin ? 'login' : 'register',
          csrfToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const targetUrl = redirectTo || ROUTES.DASHBOARD;
        
        if (onSuccess) {
          onSuccess();
        } else {
          router.replace(targetUrl);
        }
      } else {
        if (data.details) {
          setErrors({ password: data.details.join(', ') });
        } else {
          setErrors({ general: data.error || '操作失败' });
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ general: '网络错误，请稍后重试' });
    } finally {
      setIsLoading(false);
    }
  }, [validateForm, formData, isLogin, csrfToken, onSuccess, redirectTo, router]);

  // OAuth 登录
  const handleOAuthLogin = useCallback(async (provider: OAuthProvider) => {
    try {
      setOauthLoading(provider);
      setErrors({});

      const targetUrl = redirectTo || ROUTES.DASHBOARD;
      
      const result = await signIn(provider, { 
        callbackUrl: targetUrl,
        redirect: true
      });
      
      if (result && typeof result === 'object' && result.error) {
        console.error('OAuth login error:', result.error);
        
        const errorMessages: Record<string, string> = {
          'OAuthSignin': 'OAuth 登录失败，请重试',
          'OAuthCallback': 'OAuth 回调失败，请重试',
          'OAuthCreateAccount': '创建账户失败，请重试',
          'EmailCreateAccount': '邮箱账户创建失败',
          'Callback': '登录回调失败',
          'OAuthAccountNotLinked': '该邮箱已被其他登录方式使用',
          'EmailSignin': '邮箱登录失败',
          'CredentialsSignin': '登录凭据无效',
          'SessionRequired': '需要登录',
          'Default': '登录失败，请重试'
        };
        
        const errorMessage = errorMessages[result.error || 'Default'] || errorMessages['Default'] || '登录失败，请重试';
        setErrors({ general: errorMessage });
        setOauthLoading(null);
      }
    } catch (error) {
      console.error('OAuth login error:', error);
      
      let errorMessage = `${SessionUtils.getProviderDisplayName(provider)}登录失败`;
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = '登录超时，请检查网络连接后重试';
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
          errorMessage = '网络连接问题，请检查网络设置后重试';
        } else if (error.message.includes('blocked')) {
          errorMessage = '登录被阻止，请检查浏览器设置';
        }
      }
      
      setErrors({ general: errorMessage });
      setOauthLoading(null);
    }
  }, [redirectTo, router]);

  // 切换登录/注册模式
  const toggleMode = useCallback(() => {
    setIsLogin(!isLogin);
    setErrors({});
    setFormData(prev => ({
      ...prev,
      confirmPassword: '',
      agreeToTerms: false,
    }));
  }, [isLogin]);

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* 社交登录按钮 */}
      {showSocialLogin && (
        <div className="space-y-3">
          <button
            onClick={() => handleOAuthLogin(AUTH_PROVIDERS.GOOGLE as OAuthProvider)}
            disabled={!!oauthLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              {oauthLoading === AUTH_PROVIDERS.GOOGLE ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
            </div>
            使用 Google 登录
          </button>

          <button
            onClick={() => handleOAuthLogin(AUTH_PROVIDERS.GITHUB as OAuthProvider)}
            disabled={!!oauthLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              {oauthLoading === AUTH_PROVIDERS.GITHUB ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              )}
            </div>
            使用 GitHub 登录
          </button>
        </div>
      )}

      {/* 分割线 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">或者</span>
        </div>
      </div>

      {/* 传统登录表单 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 全局错误提示 */}
        {errors.general && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {errors.general}
          </div>
        )}

        {/* 邮箱字段 */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            邮箱 <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateFormData('email', e.target.value)}
            className={cn(
              "w-full px-3 py-2 border rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors",
              errors.email ? "border-red-300 bg-red-50" : "border-gray-300"
            )}
            placeholder="请输入您的邮箱"
            autoComplete="email"
            autoFocus={autoFocus && isLogin}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email}</p>
          )}
        </div>

        {/* 密码字段 */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            密码 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => updateFormData('password', e.target.value)}
              className={cn(
                "w-full px-3 py-2 pr-10 border rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors",
                errors.password ? "border-red-300 bg-red-50" : "border-gray-300"
              )}
              placeholder="请输入您的密码"
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password}</p>
          )}
        </div>

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={isLoading || !!oauthLoading}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              处理中...
            </div>
          ) : (
            isLogin ? '登录' : '注册'
          )}
        </button>

        {/* 底部链接 */}
        <div className="text-center space-y-2">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm text-blue-600 hover:text-blue-800 underline transition-colors"
            disabled={isLoading || !!oauthLoading}
          >
            {isLogin ? '没有账户？立即注册' : '已有账户？立即登录'}
          </button>
          
          {isLogin && (
            <div>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
                onClick={() => {
                  router.push('/forgot-password');
                }}
                disabled={isLoading || !!oauthLoading}
              >
                忘记密码？
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}