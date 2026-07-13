import { useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark, EmptyStateIllustration } from '../../components/branding';
import { TrackIcon } from '../../components/icons';
import {
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  SurfaceCard,
} from '../../components/ui';
import { usePermissionSetup } from '../../contexts';
import {
  confirmAutoStartEnabledByUser,
  getAndroidManufacturer,
  openAutoStartSettings,
  openBatteryOptimizationSettings,
  requestNotificationPermission,
} from '../../services/device/deviceSetupService';
import {
  requestBackgroundPermission,
  requestForegroundPermission,
} from '../../services/location/locationPermissionService';
import { colors, radius, spacing, typography } from '../../theme';
import {
  getStatusTone,
  normalizeAutoStartStatus,
  normalizeBatteryOptimizationStatus,
  normalizeLocationPermission,
  normalizeLocationServices,
  normalizeNotificationPermission,
} from '../../utils/permissionStatus';

const IOS_STEPS = [
  { id: 'foreground', icon: 'foregroundLocation', title: 'Vị trí khi dùng ứng dụng' },
  { id: 'background', icon: 'backgroundLocation', title: 'Vị trí luôn luôn' },
  { id: 'notification', icon: 'notification', title: 'Thông báo' },
  { id: 'backgroundGuide', icon: 'permission', title: 'Hướng dẫn chạy nền' },
  { id: 'complete', icon: 'permission', title: 'Hoàn tất' },
];

const ANDROID_STEPS = [
  { id: 'foreground', icon: 'foregroundLocation', title: 'Vị trí khi dùng ứng dụng' },
  { id: 'background', icon: 'backgroundLocation', title: 'Vị trí luôn cho phép' },
  { id: 'autoStart', icon: 'autoStart', title: 'Tự khởi động' },
  { id: 'battery', icon: 'batteryOptimization', title: 'Tối ưu pin' },
  { id: 'notification', icon: 'notification', title: 'Thông báo' },
  { id: 'complete', icon: 'permission', title: 'Hoàn tất' },
];

function StepStatus({ status }) {
  return (
    <StatusBadge
      label={status.label}
      status={getStatusTone(status)}
    />
  );
}

function LabeledStatusRow({ label, status }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <StepStatus status={status} />
    </View>
  );
}

export default function PermissionWizardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    completeSetup,
    isRequiredSetupReady,
    refreshing,
    refreshSetupStatus,
    setupStatus,
  } = usePermissionSetup();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const isIos = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  const isExpoGo = isRunningInExpoGo();
  const steps = isIos ? IOS_STEPS : ANDROID_STEPS;
  const currentStep = steps[stepIndex];
  const manufacturer = useMemo(
    () => (isAndroid ? getAndroidManufacturer() : ''),
    [isAndroid]
  );

  const foregroundStatus = normalizeLocationPermission(
    setupStatus?.foregroundPermission,
    { checking: refreshing && !setupStatus }
  );
  const backgroundStatus = normalizeLocationPermission(
    setupStatus?.backgroundPermission,
    { checking: refreshing && !setupStatus, unsupported: isIos && isExpoGo }
  );
  const servicesStatus = normalizeLocationServices(setupStatus?.servicesEnabled, {
    checking: refreshing && !setupStatus,
  });
  const notificationStatus = normalizeNotificationPermission(
    setupStatus?.notificationPermission,
    { checking: refreshing && !setupStatus }
  );
  const autoStartStatus = normalizeAutoStartStatus(setupStatus?.autoStart);
  const batteryStatus = normalizeBatteryOptimizationStatus(
    setupStatus?.batteryOptimization ?? { checking: refreshing && !setupStatus }
  );

  function goNext() {
    setMessage('');
    setMessageError(false);
    setStepIndex((current) => Math.min(steps.length - 1, current + 1));
  }

  function goBackStep() {
    setMessage('');
    setMessageError(false);
    setStepIndex((current) => Math.max(0, current - 1));
  }

  async function runAction(action, successMessage = '') {
    setLoading(true);
    setMessage('');
    setMessageError(false);

    try {
      await action();
      await refreshSetupStatus();
      if (successMessage) {
        setMessage(successMessage);
      }
    } catch (error) {
      setMessage(error.message ?? 'Không thể thực hiện thao tác.');
      setMessageError(true);
    } finally {
      setLoading(false);
    }
  }

  async function requestForeground() {
    setLoading(true);
    setMessage('');
    setMessageError(false);

    try {
      const permission = await requestForegroundPermission();
      await refreshSetupStatus();
      if (permission.granted) {
        goNext();
      } else {
        setMessage('Quyền vị trí khi dùng ứng dụng là bắt buộc để theo dõi GPS.');
        setMessageError(true);
      }
    } catch (error) {
      setMessage(error.message ?? 'Không thể yêu cầu quyền vị trí.');
      setMessageError(true);
    } finally {
      setLoading(false);
    }
  }

  async function requestBackground() {
    if (!setupStatus?.foregroundPermission?.granted) {
      setStepIndex(0);
      setMessage('Cần cấp quyền vị trí khi dùng ứng dụng trước khi yêu cầu quyền luôn luôn.');
      setMessageError(true);
      return;
    }

    if (isIos && isExpoGo) {
      setMessage('Expo Go không hỗ trợ theo dõi vị trí nền trên iOS. Hãy dùng bản Development Build hoặc bản cài đặt chính thức để kiểm thử.');
      setMessageError(false);
      return;
    }

    await runAction(
      requestBackgroundPermission,
      'Hãy kiểm tra lại trạng thái sau khi hệ thống trả về ứng dụng. Quyền này chỉ chuẩn bị thiết bị; theo dõi nền chưa được triển khai.'
    );
  }

  async function reviewAutoStart() {
    if (!isAndroid) return;
    await runAction(
      openAutoStartSettings,
      'Đã mở cài đặt tự khởi động. Trạng thái này chưa thể xác minh tự động.'
    );
  }

  async function confirmAutoStart() {
    if (!isAndroid) return;
    await runAction(
      confirmAutoStartEnabledByUser,
      'Đã lưu xác nhận thủ công của người dùng.'
    );
  }

  async function reviewBattery() {
    if (!isAndroid) return;
    await runAction(
      openBatteryOptimizationSettings,
      'Sau khi quay lại ứng dụng, trạng thái tối ưu pin sẽ được kiểm tra lại bằng hệ thống.'
    );
  }

  async function requestNotifications() {
    if (!isAndroid) return;
    await runAction(requestNotificationPermission);
  }

  async function finishSetup() {
    const nextStatus = await refreshSetupStatus();
    if (!isRequiredSetupReady(nextStatus)) {
      setMessage('Cần hoàn tất các mục bắt buộc trước khi lưu thiết lập. Tự khởi động và tối ưu pin là khuyến nghị.');
      setMessageError(true);
      return;
    }

    setLoading(true);
    try {
      await completeSetup();
      navigation?.goBack?.();
    } catch (error) {
      setMessage(error.message ?? 'Không thể lưu trạng thái thiết lập.');
      setMessageError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={navigation ? [] : ['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}
        keyboardShouldPersistTaps="handled"
      >
        <BrandMark variant="horizontal" size={42} style={styles.brand} />
        {!navigation ? <Text style={styles.title}>Thiết lập theo dõi</Text> : null}
        <Text style={styles.progress}>Bước {stepIndex + 1} trong {steps.length}</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((stepIndex + 1) / steps.length) * 100}%` }]} />
        </View>

        <SurfaceCard style={styles.card}>
          <View style={styles.stepIconWrap}>
            <TrackIcon name={currentStep.icon} size={52} />
          </View>
          <Text style={styles.stepTitle}>{currentStep.title}</Text>

          {currentStep.id === 'foreground' ? (
            <>
              <Text style={styles.body}>Track Device cần vị trí khi ứng dụng đang mở để ghi nhận hành trình.</Text>
              {!setupStatus?.foregroundPermission?.granted ? (
                <EmptyStateIllustration type="permissionMissing" height={88} style={styles.permissionIllustration} />
              ) : null}
              <LabeledStatusRow label="Quyền vị trí" status={foregroundStatus} />
              <LabeledStatusRow label="Dịch vụ vị trí" status={servicesStatus} />
              {!setupStatus?.foregroundPermission?.granted && setupStatus?.foregroundPermission?.canAskAgain !== false ? (
                <PrimaryButton label="Yêu cầu quyền" loading={loading} onPress={requestForeground} style={styles.action} />
              ) : null}
              {setupStatus?.servicesEnabled === false ? (
                <SecondaryButton label="Bật dịch vụ vị trí" onPress={() => Linking.openSettings()} style={styles.secondaryAction} />
              ) : null}
              {setupStatus?.foregroundPermission?.canAskAgain === false && !setupStatus?.foregroundPermission?.granted ? (
                <SecondaryButton label="Mở Cài đặt" onPress={() => Linking.openSettings()} style={styles.secondaryAction} />
              ) : null}
              <SecondaryButton label="Tiếp tục" onPress={goNext} style={styles.secondaryAction} />
            </>
          ) : null}

          {currentStep.id === 'background' ? (
            <>
              <Text style={styles.body}>
                {isIos
                  ? 'iOS có thể yêu cầu bạn mở Cài đặt để chọn Luôn luôn. Quyền này không có nghĩa là theo dõi nền đã được triển khai.'
                  : 'Trên Android 11 trở lên, hệ thống có thể mở Cài đặt để bạn chọn Luôn cho phép. Quyền này không có nghĩa là theo dõi nền đã được triển khai.'}
              </Text>
              {isIos && isExpoGo ? (
                <Text style={styles.notice}>Expo Go không hỗ trợ theo dõi vị trí nền trên iOS. Hãy dùng bản Development Build hoặc bản cài đặt chính thức để kiểm thử.</Text>
              ) : null}
              <StepStatus status={backgroundStatus} />
              <PrimaryButton label="Yêu cầu quyền" loading={loading} onPress={requestBackground} style={styles.action} />
              {setupStatus?.backgroundPermission?.canAskAgain === false && !setupStatus?.backgroundPermission?.granted ? (
                <SecondaryButton label="Mở Cài đặt" onPress={() => Linking.openSettings()} style={styles.secondaryAction} />
              ) : null}
              <SecondaryButton label="Tiếp tục" onPress={goNext} style={styles.secondaryAction} />
            </>
          ) : null}

          {currentStep.id === 'autoStart' ? (
            <>
              <Text style={styles.body}>Nhà sản xuất: {manufacturer}. Android không có API chung để xác minh tự khởi động. Hãy kiểm tra thủ công nếu thiết bị có mục này.</Text>
              <StepStatus status={autoStartStatus} />
              <PrimaryButton label="Mở cài đặt tự khởi động" loading={loading} onPress={reviewAutoStart} style={styles.action} />
              <SecondaryButton label="Tôi đã bật tự khởi động" loading={loading} onPress={confirmAutoStart} style={styles.secondaryAction} />
              <SecondaryButton label="Tiếp tục" onPress={goNext} style={styles.secondaryAction} />
            </>
          ) : null}

          {currentStep.id === 'battery' ? (
            <>
              <Text style={styles.body}>Chế độ tiết kiệm pin có thể giới hạn ứng dụng. Trạng thái này được kiểm tra bằng hệ thống khi chạy Development Build hoặc APK có native module.</Text>
              <StepStatus status={batteryStatus} />
              <PrimaryButton label="Mở cài đặt tối ưu pin" loading={loading} onPress={reviewBattery} style={styles.action} />
              <SecondaryButton label="Tiếp tục" onPress={goNext} style={styles.secondaryAction} />
            </>
          ) : null}

          {currentStep.id === 'notification' ? (
            <>
              <Text style={styles.body}>
                {isIos
                  ? 'iOS không hỗ trợ thông báo cố định kiểu foreground service như Android. Bạn có thể kiểm tra quyền thông báo trong Cài đặt hệ thống.'
                  : 'Android 13 trở lên yêu cầu quyền thông báo để hiển thị trạng thái theo dõi đang hoạt động.'}
              </Text>
              {isAndroid && isExpoGo ? (
                <Text style={styles.notice}>Thông báo foreground service cần Android Development Build hoặc APK cài đặt. Expo Go chỉ dùng để kiểm tra giao diện.</Text>
              ) : null}
              <StepStatus status={isIos ? { label: 'Kiểm tra trong Cài đặt', key: 'manual_check' } : notificationStatus} />
              {isAndroid ? (
                <PrimaryButton label="Yêu cầu quyền thông báo" loading={loading} onPress={requestNotifications} style={styles.action} />
              ) : (
                <PrimaryButton label="Mở Cài đặt" onPress={() => Linking.openSettings()} style={styles.action} />
              )}
              <SecondaryButton label="Tiếp tục" onPress={goNext} style={styles.secondaryAction} />
            </>
          ) : null}

          {currentStep.id === 'backgroundGuide' ? (
            <>
              <Text style={styles.body}>Quyền Luôn luôn chỉ chuẩn bị hệ thống. Theo dõi vị trí nền cần Development Build hoặc bản cài đặt chính thức, cấu hình native và tác vụ nền cấp ứng dụng; các phần này chưa được triển khai.</Text>
              {isExpoGo ? (
                <Text style={styles.notice}>Expo Go không hỗ trợ theo dõi vị trí nền trên iOS. Hãy dùng bản Development Build hoặc bản cài đặt chính thức để kiểm thử.</Text>
              ) : null}
              <SecondaryButton label="Tiếp tục" onPress={goNext} style={styles.secondaryAction} />
            </>
          ) : null}

          {currentStep.id === 'complete' ? (
            <>
              <Text style={styles.readyTitle}>Thiết bị đã sẵn sàng cho theo dõi khi ứng dụng đang mở.</Text>
              <Text style={styles.body}>{isIos ? 'Bạn có thể mở lại hướng dẫn này từ Cài đặt. Theo dõi nền chưa được triển khai và không hoạt động trong Expo Go.' : 'Bạn có thể mở lại hướng dẫn này từ Cài đặt. Theo dõi nền, tự khởi động và trạng thái tối ưu pin vẫn phụ thuộc giới hạn hệ điều hành.'}</Text>
              <PrimaryButton label="Hoàn tất" loading={loading} onPress={finishSetup} style={styles.action} />
            </>
          ) : null}
        </SurfaceCard>

        {message ? <Text style={[styles.message, messageError && styles.messageError]}>{message}</Text> : null}

        {stepIndex > 0 && stepIndex < steps.length - 1 ? (
          <SecondaryButton label="Bước trước" onPress={goBackStep} style={styles.backAction} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: spacing.lg },
  backAction: { marginTop: spacing.md },
  brand: { alignSelf: 'flex-start' },
  body: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  card: { marginTop: spacing.xl },
  content: { flexGrow: 1, padding: spacing.lg },
  message: { ...typography.caption, color: colors.success, marginTop: spacing.md },
  messageError: { color: colors.danger },
  notice: { ...typography.caption, color: colors.textPrimary, marginBottom: spacing.md },
  permissionIllustration: { alignSelf: 'center', marginBottom: spacing.md },
  progress: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  progressFill: { backgroundColor: colors.primary, borderRadius: radius.pill, height: '100%' },
  progressTrack: { backgroundColor: colors.border, borderRadius: radius.pill, height: 6, marginTop: spacing.sm, overflow: 'hidden' },
  readyTitle: { ...typography.cardTitle, color: colors.success, marginBottom: spacing.sm },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  secondaryAction: { marginTop: spacing.sm },
  statusLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  statusRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', marginTop: spacing.sm },
  stepIconWrap: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.large, height: 72, justifyContent: 'center', marginBottom: spacing.md, width: 72 },
  stepTitle: { ...typography.sectionTitle, color: colors.textPrimary, marginBottom: spacing.md },
  title: { ...typography.screenTitle, color: colors.textPrimary, marginTop: spacing.xs },
});
