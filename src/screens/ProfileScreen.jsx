import { StyleSheet, View } from 'react-native';
import { signOut } from 'firebase/auth';
import Toast from 'react-native-toast-message';

import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppContainer from '../components/AppContainer';
import AppText from '../components/AppText';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebase/firebaseConfig';

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, spacing, mode, toggleTheme } = useTheme();
  const email = user?.email || 'Not logged in';

  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
      Toast.show({
        type: 'error',
        text1: 'Logout failed. Please try again.',
        visibilityTime: 3000,
      });
    }
  }

  function handleLoginPress() {
    navigation.navigate('Login');
  }

  return (
    <AppContainer>
      <View style={styles.inner}>
        <View style={styles.welcomeRow}>
          <View>
            <AppText variant="caption" style={{ color: colors.textSecondary }}>
              Account
            </AppText>
            <AppText variant="heading">Profile</AppText>
          </View>
        </View>

        <AppCard>
          <View style={styles.cardContent}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <AppText
                variant="title"
                style={{ color: '#FFFFFF', fontWeight: '700' }}
              >
                {email?.[0]?.toUpperCase() || '?'}
              </AppText>
            </View>
            <View style={styles.userInfo}>
              <AppText variant="body" style={{ fontWeight: '600' }}>
                {email}
              </AppText>
              <AppText
                variant="caption"
                style={{ color: user ? colors.success : colors.textSecondary }}
              >
                {user ? 'Signed in' : 'Guest mode'}
              </AppText>
            </View>
          </View>
        </AppCard>

        <View style={[styles.section, { marginTop: spacing.lg }]}>
          <AppText variant="title" style={styles.sectionTitle}>
            Settings
          </AppText>

          <AppCard>
            <View style={styles.settingRow}>
              <AppText variant="body">Theme</AppText>
              <AppText variant="caption" style={{ color: colors.textSecondary }}>
                {mode === 'dark' ? 'Dark' : 'Light'}
              </AppText>
            </View>
            <View style={styles.settingAction}>
              <AppButton title="Switch Theme" onPress={toggleTheme} />
            </View>
          </AppCard>

          <AppCard>
            <View style={styles.settingRow}>
              <AppText variant="body">Language</AppText>
              <AppText variant="caption" style={{ color: colors.textSecondary }}>
                English
              </AppText>
            </View>
          </AppCard>
        </View>

        <View style={styles.footer}>
          {user ? (
            <AppButton title="Logout" onPress={handleLogout} />
          ) : (
            <AppButton title="Login / Register" onPress={handleLoginPress} />
          )}
        </View>
      </View>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    gap: 16,
  },
  welcomeRow: {
    marginBottom: 4,
  },
  cardContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 999,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    marginBottom: 2,
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  settingAction: {
    marginTop: 12,
  },
  footer: {
    marginTop: 'auto',
  },
});
