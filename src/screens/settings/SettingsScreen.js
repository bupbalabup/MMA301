import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrackIcon } from '../../components/icons';
import {
  AppHeader,
  DangerButton,
  SettingsListItem,
  SurfaceCard,
} from '../../components/ui';
import { MainRoutes } from '../../constants/routes';
import { useAuth, useDevice, useTracking } from '../../contexts';
import {
  logSecurityEvent,
  SECURITY_ACTIONS,
} from '../../services/firebase/accountSecurityService';
import { colors, spacing, typography } from '../../theme';

function Section({ children, icon, title }) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeading}>
        <TrackIcon name={icon} size={22} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <SurfaceCard style={styles.sectionCard}>{children}</SurfaceCard>
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();
  const { localDeviceId, localDeviceName } = useDevice();
  const { isTrackingEnabled } = useTracking();

  function confirmLogout() {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất khỏi thiết bị này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              if (user?.uid) {
                await logSecurityEvent(user.uid, {
                  action: SECURITY_ACTIONS.LOGOUT,
                  deviceId: localDeviceId,
                  deviceName: localDeviceName,
                  platform: Platform.OS,
                });
              }
            } catch (error) {
              console.warn('Failed to log logout event.', error);
            }

            await logout();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <AppHeader
        title="Cài đặt"
        subtitle="Thiết bị, theo dõi, tài khoản và dữ liệu"
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.md },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Section icon="device" title="THIẾT BỊ VÀ TÀI KHOẢN">
          <SettingsListItem
            icon="device"
            title="Tài khoản và thiết bị"
            subtitle="Quản lý bảo mật, phiên đăng nhập và thiết bị"
            onPress={() => navigation.navigate(MainRoutes.Account)}
          />
        </Section>

        <Section icon="movement" title="THEO DÕI">
          <SettingsListItem
            icon="movement"
            title="Theo dõi vị trí"
            subtitle="Xem trạng thái theo dõi hiện tại"
            value={isTrackingEnabled ? 'Đang bật' : 'Đang tắt'}
            onPress={() => navigation.navigate(MainRoutes.LiveTracking)}
          />
          <SettingsListItem
            icon="permission"
            title="Quyền truy cập"
            subtitle="Vị trí, chạy nền và thiết lập hệ thống"
            onPress={() => navigation.navigate(MainRoutes.PermissionSetup)}
          />
        </Section>

        <Section icon="sync" title="DỮ LIỆU VÀ THÔNG BÁO">
          <SettingsListItem
            icon="sync"
            title="Đồng bộ"
            subtitle="Trạng thái dữ liệu và chuyến đang chờ"
            onPress={() => navigation.navigate(MainRoutes.SyncStatus)}
          />
          <SettingsListItem
            icon="notification"
            title="Thông báo"
            subtitle="Tuỳ chọn thông báo trong ứng dụng"
            onPress={() => navigation.navigate(MainRoutes.NotificationPreferences)}
          />
        </Section>

        <Section icon="settings" title="ỨNG DỤNG">
          <SettingsListItem
            icon="settings"
            title="Phiên bản"
            value="v1.0.0"
          />
          <SettingsListItem
            icon="location"
            title="Giới thiệu"
            subtitle="Track Device theo dõi vị trí thiết bị theo thời gian thực"
          />
          <DangerButton
            label="Đăng xuất"
            onPress={confirmLogout}
            style={styles.logoutButton}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
  },
  logoutButton: {
    marginTop: spacing.md,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  sectionBlock: {
    marginTop: spacing.lg,
  },
  sectionCard: {
    marginTop: 0,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
  },
});
