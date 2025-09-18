'use client';

import React, { useEffect, useState, useCallback } from 'react';
import type { PerformanceMetrics } from '@/types';
import { cn } from '@/lib/utils';

/**
 * 性能监控组件
 * 监控页面加载性能和用户体验指标
 */
export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isVisible, setIsVisible] = useState(false);

  const updateMetric = useCallback((key: keyof PerformanceMetrics, value: number) => {
    setMetrics(prev => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    // 只在开发环境或启用性能监控时运行
    if (process.env.NODE_ENV !== 'development' && !process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITOR) {
      return;
    }

    let observer: PerformanceObserver | null = null;

    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          switch (entry.entryType) {
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                updateMetric('fcp', entry.startTime);
              }
              break;
            case 'largest-contentful-paint':
              updateMetric('lcp', entry.startTime);
              break;
            case 'layout-shift':
              if (!(entry as any).hadRecentInput) {
                setMetrics(prev => ({ 
                  ...prev, 
                  cls: (prev.cls || 0) + (entry as any).value 
                }));
              }
              break;
            case 'first-input':
              updateMetric('fid', (entry as any).processingStart - entry.startTime);
              break;
            case 'navigation':
              const navEntry = entry as PerformanceNavigationTiming;
              updateMetric('ttfb', navEntry.responseStart - navEntry.requestStart);
              break;
          }
        }
      });

      // 观察各种性能指标
      observer.observe({ 
        entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input', 'navigation'] 
      });
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }

    return () => {
      observer?.disconnect();
    };
  }, [updateMetric]);

  // 性能警告阈值
  const thresholds: Required<PerformanceMetrics> = {
    fcp: 1800, // First Contentful Paint
    lcp: 2500, // Largest Contentful Paint
    cls: 0.1,  // Cumulative Layout Shift
    fid: 100,  // First Input Delay
    ttfb: 600, // Time to First Byte
  };

  // 检查性能问题
  const performanceIssues = Object.entries(metrics).filter(([key, value]) => {
    const threshold = thresholds[key as keyof PerformanceMetrics];
    return value !== undefined && value > threshold;
  });

  // 只在开发环境显示性能信息
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getMetricColor = (key: string, value: number): string => {
    const threshold = thresholds[key as keyof PerformanceMetrics];
    if (value <= threshold * 0.5) return 'text-green-400';
    if (value <= threshold) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatMetricValue = (key: string, value: number): string => {
    if (key === 'cls') {
      return value.toFixed(3);
    }
    return `${Math.round(value)}ms`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="mb-2 px-3 py-2 bg-black/80 text-white rounded-lg text-xs font-mono hover:bg-black/90 transition-colors"
      >
        ⚡ Performance {performanceIssues.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white rounded text-xs">
            {performanceIssues.length}
          </span>
        )}
      </button>
      
      {isVisible && (
        <div className={cn(
          "bg-black/90 text-white p-4 rounded-lg text-xs font-mono max-w-xs",
          "animate-slide-in-from-bottom"
        )}>
          <div className="font-bold mb-3 flex items-center justify-between">
            <span>Performance Metrics</span>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            {Object.entries(metrics).map(([key, value]) => {
              if (value === undefined) return null;
              
              const color = getMetricColor(key, value);
              
              return (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-gray-300">{key.toUpperCase()}:</span>
                  <span className={color}>{formatMetricValue(key, value)}</span>
                </div>
              );
            })}
          </div>
          
          {performanceIssues.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <div className="text-red-400 text-xs font-semibold mb-1">
                ⚠️ Issues Detected:
              </div>
              <div className="text-xs text-gray-300">
                {performanceIssues.map(([key]) => key.toUpperCase()).join(', ')}
              </div>
            </div>
          )}
          
          <div className="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-400">
            <div>Good: Green | Warning: Yellow | Poor: Red</div>
          </div>
        </div>
      )}
    </div>
  );
}

