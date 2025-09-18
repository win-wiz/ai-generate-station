import { useState, useCallback } from 'react';

/**
 * 切换状态 Hook
 */
export function useToggle(
  initialValue = false
): [boolean, () => void, (value?: boolean) => void] {
  const [value, setValue] = useState<boolean>(initialValue);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);

  const setToggle = useCallback((newValue?: boolean) => {
    setValue(newValue ?? !value);
  }, [value]);

  return [value, toggle, setToggle];
}