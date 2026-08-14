import { useEffect } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';

/**
 * Forces light mode while the component is mounted.
 * Restores the previous theme on unmount (for portal pages).
 */
export function useForceLightMode() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (theme !== 'light') {
      setTheme('light');
    }
  }, [theme, setTheme]);
}
