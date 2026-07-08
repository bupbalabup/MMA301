import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../context/ThemeContext';

export default function AppButton({ title, onPress }) {
  const { colors, typography } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.title, typography.body]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
