import { ScrollView, StyleSheet, View } from 'react-native';

import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppContainer from '../components/AppContainer';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning ☀️';
  if (hour < 18) return 'Good afternoon 🌤';
  return 'Good evening 🌙';
}

export default function HomeScreen({ navigation }) {
  const { colors, spacing } = useTheme();

  return (
    <AppContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="caption" style={{ color: colors.textSecondary }}>
            {getGreeting()}
          </AppText>
          <AppText variant="heading">Future Room</AppText>
          <AppText variant="body" style={{ color: colors.textSecondary }}>
            Design your dream room with AI
          </AppText>
        </View>

        {/* Primary CTA */}
        <AppButton
          title="Analyze My Room"
          onPress={() => navigation?.navigate('Camera')}
        />

        {/* AI Modes */}
        <View style={[styles.section, { marginTop: spacing.lg }]}>
          <AppText variant="title" style={styles.sectionTitle}>
            AI Modes
          </AppText>
          <View style={styles.cardRow}>
            <AppCard style={{ flex: 1 }}>
              <AppText style={styles.modeEmoji}>🔍</AppText>
              <AppText variant="body" style={styles.modeLabel}>Consultant</AppText>
              <AppText variant="caption" style={{ color: colors.textSecondary }}>
                Analyze your room
              </AppText>
            </AppCard>
            <AppCard style={{ flex: 1 }}>
              <AppText style={styles.modeEmoji}>✨</AppText>
              <AppText variant="body" style={styles.modeLabel}>Renovation</AppText>
              <AppText variant="caption" style={{ color: colors.textSecondary }}>
                Keep the layout
              </AppText>
            </AppCard>
            <AppCard style={{ flex: 1 }}>
              <AppText style={styles.modeEmoji}>🎨</AppText>
              <AppText variant="body" style={styles.modeLabel}>Design</AppText>
              <AppText variant="caption" style={{ color: colors.textSecondary }}>
                Full redesign
              </AppText>
            </AppCard>
          </View>
        </View>

        {/* Recent Analysis */}
        <View style={[styles.section, { marginTop: spacing.lg }]}>
          <AppText variant="title" style={styles.sectionTitle}>
            Recent Analysis
          </AppText>
          <AppCard>
            <AppText
              variant="body"
              style={{ color: colors.textSecondary, textAlign: 'center' }}
            >
              No analysis yet.{'\n'}Tap "Analyze My Room" to get started.
            </AppText>
          </AppCard>
        </View>
      </ScrollView>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 32,
  },
  header: {
    gap: 6,
    marginBottom: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeEmoji: {
    fontSize: 20,
    marginBottom: 6,
  },
  modeLabel: {
    fontWeight: '600',
    marginBottom: 2,
  },
});
