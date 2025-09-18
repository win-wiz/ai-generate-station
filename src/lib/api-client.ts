/**
 * 优化的 API 客户端
 */

import { API_CONFIG, HTTP_STATUS } from './constants';
import type { ApiResponse, RequestConfig } from '../types';

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL = API_CONFIG.BASE_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * 设置认证令牌
   */
  setAuthToken(token: string) {
    this.defaultHeaders.Authorization = `Bearer ${token}`;
  }

  /**
   * 移除认证令牌
   */
  removeAuthToken() {
    delete this.defaultHeaders.Authorization;
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      data,
      headers = {},
      timeout = API_CONFIG.TIMEOUT,
      retries = API_CONFIG.RETRY_ATTEMPTS,
      ...restConfig
    } = config;

    const url = `${this.baseURL}${endpoint}`;
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
      signal: controller.signal,
      ...restConfig,
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestConfig.body = JSON.stringify(data);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, requestConfig);
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          throw new ApiError(
            errorData.message || `HTTP ${response.status}`,
            response.status,
            errorData
          );
        }

        const result = await this.parseResponse<T>(response);
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        return {
          data: result,
          status: response.status,
          headers,
        };
      } catch (error) {
        lastError = error as Error;
        
        // 如果是最后一次尝试或者不是网络错误，直接抛出
        if (attempt === retries || !this.isRetryableError(error)) {
          break;
        }

        // 等待一段时间后重试
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    clearTimeout(timeoutId);
    throw lastError || new Error('Request failed');
  }

  /**
   * 解析响应数据
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    
    if (contentType?.includes('text/')) {
      return response.text() as unknown as T;
    }
    
    return response.blob() as unknown as T;
  }

  /**
   * 解析错误响应
   */
  private async parseErrorResponse(response: Response): Promise<any> {
    try {
      return await response.json();
    } catch {
      return { message: response.statusText };
    }
  }

  /**
   * 判断是否为可重试的错误
   */
  private isRetryableError(error: any): boolean {
    if (error.name === 'AbortError') return false;
    if (error instanceof ApiError) {
      const retryableStatuses = [
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        HTTP_STATUS.BAD_GATEWAY,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        HTTP_STATUS.GATEWAY_TIMEOUT,
      ] as const;
      return retryableStatuses.includes(error.status as typeof retryableStatuses[number]);
    }
    return true; // 网络错误等
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // HTTP 方法快捷方式
  async get<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'data'>) {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method'>) {
    return this.request<T>(endpoint, { ...config, method: 'POST', data });
  }

  async put<T>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method'>) {
    return this.request<T>(endpoint, { ...config, method: 'PUT', data });
  }

  async patch<T>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method'>) {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', data });
  }

  async delete<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'data'>) {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

/**
 * 自定义 API 错误类
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 导出默认实例
export const apiClient = new ApiClient();

// 导出类以便创建新实例
export { ApiClient };