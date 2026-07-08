import { StyleSheet, Text } from 'react-native';

import { useTheme } from '../context/ThemeContext';

export default function AppText({ children, variant = 'body', style }) {
  const { colors, typography } = useTheme();
  const textStyle = typography[variant] || typography.body;

  return (
    <Text style={[styles.text, { color: colors.text }, textStyle, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    includeFontPadding: false,
  },
});
