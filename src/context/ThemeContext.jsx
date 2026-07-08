import { createContext, useContext, useMemo, useState } from 'react';

import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';

const darkColors = {
  ...colors,
  background: '#111827',
  surface: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  border: '#374151',
};

const defaultTheme = {
  mode: 'light',
  colors,
  spacing,
  typography,
  toggleTheme: () => {},
};

const ThemeContext = createContext(defaultTheme);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');

  const theme = useMemo(
    () => ({
      mode,
      colors: mode === 'dark' ? darkColors : colors,
      spacing,
      typography,
      toggleTheme: () => {
        setMode((currentMode) => (currentMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
