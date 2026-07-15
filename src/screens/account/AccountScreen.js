import { Alert, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import PasswordConfirmModal from '../../components/security/PasswordConfirmModal';
import {
  SettingsListItem,
  SurfaceCard,
} from '../../components/ui';
import { MainRoutes } from '../../constants/routes';
import { useAuth, useDevice } from '../../contexts';
import {
  logSecurityEvent,
  revokeAllDeviceSessions,
  SECURITY_ACTIONS,
} from '../../services/firebase/accountSecurityService';
import { colors, spacing, typography } from '../../theme';

export default function AccountScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { confirmPassword, logout, user } = useAuth();
  const { localDeviceId, localDeviceName } = useDevice();
  const [confirmAllVisible, setConfirmAllVisible] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  async function performLogoutAll() {
    if (!user?.uid || confirmLoading) {
      return;
    }

    setConfirmLoading(true);
    try {
      await revokeAllDeviceSessions(user.uid, 'logout_all');
      await logSecurityEvent(user.uid, {
        action: SECURITY_ACTIONS.LOGOUT_ALL,
        deviceId: localDeviceId,
        deviceName: localDeviceName,
        platform: Platform.OS,
      });
      await logout();
    } catch (error) {
      setConfirmError(error.message ?? 'Không thể đăng xuất tất cả thiết bị.');
      setConfirmAllVisible(true);
    } finally {
      setConfirmLoading(false);
    }
  }

  async function confirmLogoutAll(password) {
    if (!user?.uid) return;

    setConfirmLoading(true);
    setConfirmError('');

    try {
      await confirmPassword(password);
      setConfirmLoading(false);
      setConfirmAllVisible(false);

      Alert.alert(
        'Đăng xuất tất cả thiết bị',
        'Thiết bị hiện tại cũng sẽ đăng xuất. Bạn có chắc muốn tiếp tục?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Đăng xuất tất cả',
            style: 'destructive',
            onPress: performLogoutAll,
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      setConfirmError(error.message ?? 'Không thể xác nhận mật khẩu.');
      setConfirmLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          Quản lý bảo mật, phiên đăng nhập và thiết bị theo dõi trong tài khoản.
        </Text>

        <SurfaceCard style={styles.card}>
          <Text style={styles.emailLabel}>Email</Text>
          <Text style={styles.emailValue}>{user?.email ?? 'Không xác định'}</Text>
        </SurfaceCard>

        <Section title="BẢO MẬT">
          <SettingsListItem
            icon="permission"
            title="Đổi mật khẩu"
            subtitle="Cập nhật mật khẩu đăng nhập"
            onPress={() => navigation.navigate(MainRoutes.ChangePassword)}
          />
          <SettingsListItem
            icon="settings"
            title="Nhật ký hoạt động"
            subtitle="Đăng nhập, đổi mật khẩu và thao tác thiết bị"
            onPress={() => navigation.navigate(MainRoutes.ActivityLog)}
          />
        </Section>

        <Section title="PHIÊN ĐĂNG NHẬP">
          <SettingsListItem
            icon="foregroundLocation"
            title="Thiết bị đang đăng nhập"
            subtitle="Xem danh sách phiên đăng nhập"
            onPress={() => navigation.navigate(MainRoutes.SignedInDevices)}
          />
          <SettingsListItem
            icon="lostConnection"
            title="Đăng xuất một thiết bị"
            subtitle="Chọn phiên cần đăng xuất"
            onPress={() => navigation.navigate(MainRoutes.SelectSessionToLogout)}
          />
          <SettingsListItem
            destructive
            icon="close"
            title="Đăng xuất tất cả thiết bị"
            subtitle="Đánh dấu đăng xuất các phiên trong Track Device"
            onPress={() => {
              setConfirmError('');
              setConfirmAllVisible(true);
            }}
          />
        </Section>

        <Section title="THIẾT BỊ THEO DÕI">
          <SettingsListItem
            icon="device"
            title="Đổi tên và màu trên bản đồ"
            subtitle="Chỉnh tên thiết bị và màu hiển thị"
            onPress={() => navigation.navigate(MainRoutes.MyDevices)}
          />
          <SettingsListItem
            destructive
            icon="close"
            title="Xóa thiết bị"
            subtitle="Chọn thiết bị cần xóa khỏi tài khoản"
            onPress={() => navigation.navigate(MainRoutes.SelectDeviceToDelete)}
          />
        </Section>

        <Section title="TÀI KHOẢN">
          <SettingsListItem
            destructive
            icon="close"
            title="Xóa tài khoản"
            subtitle="Xóa tài khoản và toàn bộ dữ liệu Track Device"
            onPress={() => navigation.navigate(MainRoutes.DeleteAccount)}
          />
        </Section>
      </ScrollView>

      <PasswordConfirmModal
        error={confirmError}
        loading={confirmLoading}
        onCancel={() => {
          if (!confirmLoading) {
            setConfirmAllVisible(false);
            setConfirmError('');
          }
        }}
        onConfirm={confirmLogoutAll}
        title="Nhập mật khẩu để xác nhận."
        visible={confirmAllVisible}
      />
    </SafeAreaView>
  );
}

function Section({ children, title }) {
  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      <SurfaceCard style={styles.card}>{children}</SurfaceCard>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  content: {
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  emailLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  emailValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});
