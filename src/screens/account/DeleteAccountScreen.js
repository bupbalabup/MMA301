import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import PasswordConfirmModal from '../../components/security/PasswordConfirmModal';
import { DangerButton, SurfaceCard } from '../../components/ui';
import { useAuth } from '../../contexts';
import { deleteCurrentAccountData } from '../../services/firebase/accountDeletionService';
import { disableTracking } from '../../services/tracking';
import { colors, spacing, typography } from '../../theme';

const DATA_ITEMS = [
  'Hồ sơ tài khoản và email đăng nhập',
  'Thiết bị, phiên đăng nhập và nhật ký hoạt động',
  'Vị trí trực tiếp, lịch sử chuyến đi và dữ liệu GPS trên đám mây',
  'Lịch sử hành trình và dữ liệu theo dõi lưu trên thiết bị này',
];

export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const { confirmPassword } = useAuth();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function performDeletion() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await disableTracking('account deletion');
      await deleteCurrentAccountData();
    } catch (deleteError) {
      setError(
        deleteError?.message ??
          'Không thể hoàn tất xóa tài khoản. Hãy kiểm tra mạng và thử lại.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function confirmPasswordAndContinue(password) {
    if (loading) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await confirmPassword(password);
      setPasswordVisible(false);
      setLoading(false);

      Alert.alert(
        'Xóa vĩnh viễn tài khoản?',
        'Thao tác này không thể hoàn tác. Quá trình xóa gồm nhiều bước; nếu kết nối bị gián đoạn, bạn có thể cần đăng nhập và thử lại để xóa phần dữ liệu còn lại.',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa tài khoản',
            style: 'destructive',
            onPress: performDeletion,
          },
        ],
        { cancelable: false }
      );
    } catch (confirmError) {
      setError(confirmError?.message ?? 'Mật khẩu không đúng.');
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <Text style={styles.intro}>
          Xóa tài khoản sẽ dừng theo dõi và xóa dữ liệu Track Device thuộc tài
          khoản hiện tại. Không thể khôi phục dữ liệu sau khi hoàn tất.
        </Text>

        <SurfaceCard style={styles.card}>
          <Text style={styles.cardTitle}>Dữ liệu sẽ bị xóa</Text>
          {DATA_ITEMS.map((item) => (
            <View key={item} style={styles.dataRow}>
              <View style={styles.bullet} />
              <Text style={styles.dataText}>{item}</Text>
            </View>
          ))}
        </SurfaceCard>

        <Text style={styles.notice}>
          Cần kết nối Internet ổn định. Quá trình xóa dữ liệu đám mây gồm nhiều
          bước; nếu bị gián đoạn, hãy thử lại để xóa phần dữ liệu còn lại.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <DangerButton
          disabled={loading}
          label={loading ? 'Đang xử lý...' : 'Tiếp tục xóa tài khoản'}
          loading={loading}
          onPress={() => {
            setError('');
            setPasswordVisible(true);
          }}
          style={styles.action}
        />
      </ScrollView>

      <PasswordConfirmModal
        error={error}
        loading={loading}
        onCancel={() => {
          if (!loading) {
            setPasswordVisible(false);
            setError('');
          }
        }}
        onConfirm={confirmPasswordAndContinue}
        title="Nhập mật khẩu để xóa tài khoản."
        visible={passwordVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: spacing.lg,
  },
  bullet: {
    backgroundColor: colors.danger,
    borderRadius: 3,
    height: 6,
    marginTop: 7,
    width: 6,
  },
  card: {
    marginTop: spacing.lg,
  },
  cardTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  content: {
    padding: spacing.lg,
  },
  dataRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dataText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 21,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
  intro: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  notice: {
    ...typography.caption,
    color: colors.warning,
    lineHeight: 19,
    marginTop: spacing.lg,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
