import { useRef, useEffect } from 'react';

/**
 * 获取前一个值 Hook
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  });

  return ref.current;
}