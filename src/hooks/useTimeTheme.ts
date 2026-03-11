import { useState, useEffect } from 'react';

export type TimeTheme = 'dawn' | 'day' | 'dusk' | 'night';

export interface ThemeColors {
  gradientStart: string;
  gradientEnd: string;
  particleType: 'petal' | 'firefly' | 'snow';
  isDark: boolean;
}

function getTimeTheme(): TimeTheme {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'dawn';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

const themeMap: Record<TimeTheme, ThemeColors> = {
  dawn: {
    gradientStart: '#E0F2F1',
    gradientEnd: '#FFFFFF',
    particleType: 'petal',
    isDark: false,
  },
  day: {
    gradientStart: '#E8F5E9',
    gradientEnd: '#F1F8E9',
    particleType: 'petal',
    isDark: false,
  },
  dusk: {
    gradientStart: '#FFCCBC',
    gradientEnd: '#FFAB91',
    particleType: 'petal',
    isDark: false,
  },
  night: {
    gradientStart: '#1A237E',
    gradientEnd: '#3949AB',
    particleType: 'firefly',
    isDark: true,
  },
};

export function useTimeTheme() {
  const [theme, setTheme] = useState<TimeTheme>(getTimeTheme);

  useEffect(() => {
    const interval = setInterval(() => {
      setTheme(getTimeTheme());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return { theme, colors: themeMap[theme] };
}
