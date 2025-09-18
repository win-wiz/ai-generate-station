/**
 * 网络请求重试工具
 */

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, backoff = true } = options;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        console.error(`Request failed after ${maxRetries + 1} attempts:`, lastError);
        throw lastError;
      }
      
      // 计算延迟时间
      const currentDelay = backoff ? delay * Math.pow(2, attempt) : delay;
      
      console.warn(`Request attempt ${attempt + 1} failed, retrying in ${currentDelay}ms:`, error);
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
  
  throw lastError!;
}

/**
 * 检查是否是网络相关错误
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  const networkErrorCodes = [
    'ECONNRESET',
    'ECONNREFUSED', 
    'ETIMEDOUT',
    'ENOTFOUND',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_SOCKET'
  ];
  
  const networkErrorNames = [
    'ConnectTimeoutError',
    'NetworkError',
    'FetchError'
  ];
  
  return (
    networkErrorCodes.includes(error.code) ||
    networkErrorNames.includes(error.name) ||
    error.message?.includes('fetch failed') ||
    error.message?.includes('network') ||
    error.message?.includes('timeout')
  );
}

/**
 * 增强的fetch函数，带有重试机制
 */
export async function fetchWithRetry(
  url: string, 
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, {
      ...options,
      // 设置默认超时
      signal: options.signal || AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }, retryOptions);
}