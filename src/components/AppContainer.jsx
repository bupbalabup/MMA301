import { StyleSheet, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';

export default function AppContainer({ children, style }) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
