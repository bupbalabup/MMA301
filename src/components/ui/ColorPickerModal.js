import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import {
  getSafeMarkerColor,
  hexToHsv,
  hsvToHex,
  isValidHexColor,
  MARKER_COLOR_PRESETS,
  normalizeHexColor,
} from '../../utils/color';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';

const SATURATION_STEPS = 12;
const BRIGHTNESS_STEPS = 10;
const HUE_STEPS = 24;

function clampRatio(value, size) {
  if (!size) {
    return 0;
  }

  return Math.max(0, Math.min(1, value / size));
}

export default function ColorPickerModal({
  initialColor,
  onCancel,
  onDone,
  visible,
}) {
  const initialHsv = useMemo(() => hexToHsv(getSafeMarkerColor(initialColor)), [initialColor]);
  const [hue, setHue] = useState(initialHsv.hue);
  const [saturation, setSaturation] = useState(initialHsv.saturation);
  const [brightness, setBrightness] = useState(initialHsv.value);
  const [hexInput, setHexInput] = useState(getSafeMarkerColor(initialColor));
  const [hexError, setHexError] = useState('');
  const [svSize, setSvSize] = useState({ height: 1, width: 1 });
  const [hueWidth, setHueWidth] = useState(1);
  const latestColor = hsvToHex(hue, saturation, brightness);
  const lastValidColorRef = useRef(getSafeMarkerColor(initialColor));

  function applyColor(nextColor) {
    const normalized = normalizeHexColor(nextColor);
    if (!normalized) {
      return;
    }

    const nextHsv = hexToHsv(normalized);
    setHue(nextHsv.hue);
    setSaturation(nextHsv.saturation);
    setBrightness(nextHsv.value);
    setHexInput(normalized);
    setHexError('');
    lastValidColorRef.current = normalized;
  }

  function updateSaturationBrightness(locationX, locationY) {
    const nextSaturation = clampRatio(locationX, svSize.width);
    const nextBrightness = 1 - clampRatio(locationY, svSize.height);
    const nextColor = hsvToHex(hue, nextSaturation, nextBrightness);
    setSaturation(nextSaturation);
    setBrightness(nextBrightness);
    setHexInput(nextColor);
    setHexError('');
    lastValidColorRef.current = nextColor;
  }

  function updateHue(locationX) {
    const nextHue = clampRatio(locationX, hueWidth) * 360;
    const nextColor = hsvToHex(nextHue, saturation, brightness);
    setHue(nextHue);
    setHexInput(nextColor);
    setHexError('');
    lastValidColorRef.current = nextColor;
  }

  const saturationResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        updateSaturationBrightness(
          event.nativeEvent.locationX,
          event.nativeEvent.locationY
        );
      },
      onPanResponderMove: (event) => {
        updateSaturationBrightness(
          event.nativeEvent.locationX,
          event.nativeEvent.locationY
        );
      },
    }),
    [hue, svSize]
  );

  const hueResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => updateHue(event.nativeEvent.locationX),
      onPanResponderMove: (event) => updateHue(event.nativeEvent.locationX),
    }),
    [brightness, hueWidth, saturation]
  );

  function handleHexChange(value) {
    const prefixedValue = value.startsWith('#') || value.length === 0
      ? value
      : `#${value}`;
    const normalizedInput = prefixedValue.toUpperCase();
    setHexInput(normalizedInput);

    if (normalizedInput.length >= 7) {
      const normalized = normalizeHexColor(normalizedInput);
      if (normalized) {
        applyColor(normalized);
      } else {
        setHexError('Mã màu HEX phải có dạng #RRGGBB.');
      }
    } else {
      setHexError('');
    }
  }

  function handleDone() {
    const normalized = normalizeHexColor(hexInput);
    if (!normalized) {
      setHexError('Mã màu HEX phải có dạng #RRGGBB.');
      return;
    }

    onDone(normalized);
  }

  const saturationCells = [];
  for (let row = 0; row < BRIGHTNESS_STEPS; row += 1) {
    for (let column = 0; column < SATURATION_STEPS; column += 1) {
      saturationCells.push({
        color: hsvToHex(
          hue,
          column / (SATURATION_STEPS - 1),
          1 - row / (BRIGHTNESS_STEPS - 1)
        ),
        key: `${row}-${column}`,
      });
    }
  }

  const hueCells = Array.from({ length: HUE_STEPS }, (_, index) => ({
    color: hsvToHex((index / HUE_STEPS) * 360, 1, 1),
    key: String(index),
  }));

  useEffect(() => {
    if (!visible) {
      return;
    }

    const safeInitialColor = getSafeMarkerColor(initialColor);
    const nextHsv = hexToHsv(safeInitialColor);
    setHue(nextHsv.hue);
    setSaturation(nextHsv.saturation);
    setBrightness(nextHsv.value);
    setHexInput(safeInitialColor);
    setHexError('');
    lastValidColorRef.current = safeInitialColor;
  }, [initialColor, visible]);

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Chọn màu marker trên bản đồ</Text>
          <Text style={styles.description}>
            Màu này chỉ áp dụng cho phần nền chính của marker thiết bị trên bản đồ trực tiếp.
          </Text>

          <View style={styles.previewRow}>
            <View
              accessible
              accessibilityLabel={`Màu marker hiện tại: ${lastValidColorRef.current}`}
              style={[styles.preview, { backgroundColor: latestColor }]}
            />
            <Text style={styles.previewText}>{latestColor}</Text>
          </View>

          <View
            {...saturationResponder.panHandlers}
            accessibilityLabel="Vùng chọn độ bão hòa và độ sáng của màu marker"
            accessible
            onLayout={(event) => setSvSize(event.nativeEvent.layout)}
            style={styles.saturationGrid}
          >
            {saturationCells.map((cell) => (
              <View
                key={cell.key}
                style={[
                  styles.saturationCell,
                  { backgroundColor: cell.color },
                ]}
              />
            ))}
            <View
              pointerEvents="none"
              style={[
                styles.saturationHandle,
                {
                  left: `${saturation * 100}%`,
                  top: `${(1 - brightness) * 100}%`,
                },
              ]}
            />
          </View>

          <Text style={styles.fieldLabel}>Hue</Text>
          <View
            {...hueResponder.panHandlers}
            accessibilityLabel="Thanh chọn Hue của màu marker"
            accessible
            onLayout={(event) => setHueWidth(event.nativeEvent.layout.width)}
            style={styles.hueBar}
          >
            {hueCells.map((cell) => (
              <View key={cell.key} style={[styles.hueCell, { backgroundColor: cell.color }]} />
            ))}
            <View
              pointerEvents="none"
              style={[
                styles.hueHandle,
                { left: `${(hue / 360) * 100}%` },
              ]}
            />
          </View>

          <Text style={styles.fieldLabel}>Mã HEX</Text>
          <TextInput
            accessibilityLabel="Nhập mã màu HEX cho marker"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            onChangeText={handleHexChange}
            placeholder="#00C2FF"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, hexError && styles.inputError]}
            value={hexInput}
          />
          {hexError ? <Text style={styles.errorText}>{hexError}</Text> : null}

          <Text style={styles.fieldLabel}>Màu gợi ý</Text>
          <View style={styles.presetRow}>
            {MARKER_COLOR_PRESETS.map((preset) => (
              <Pressable
                accessibilityLabel={`Chọn màu ${preset}`}
                accessibilityRole="button"
                key={preset}
                onPress={() => applyColor(preset)}
                style={[
                  styles.preset,
                  { backgroundColor: preset },
                  latestColor === preset && styles.presetSelected,
                ]}
              />
            ))}
          </View>

          <View style={styles.actionRow}>
            <SecondaryButton label="Hủy" onPress={onCancel} style={styles.actionButton} />
            <PrimaryButton
              disabled={!isValidHexColor(hexInput)}
              label="Xong"
              onPress={handleDone}
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  hueBar: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    height: 28,
    overflow: 'hidden',
  },
  hueCell: {
    flex: 1,
  },
  hueHandle: {
    backgroundColor: colors.surface,
    borderColor: colors.textPrimary,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 34,
    marginLeft: -6,
    position: 'absolute',
    top: -4,
    width: 12,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    color: colors.textPrimary,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  inputError: {
    borderColor: colors.danger,
  },
  preset: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 30,
    width: 30,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetSelected: {
    borderColor: colors.textPrimary,
    borderWidth: 3,
  },
  preview: {
    borderColor: colors.borderStrong,
    borderRadius: radius.medium,
    borderWidth: 1,
    height: 44,
    width: 64,
  },
  previewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  previewText: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  saturationCell: {
    height: `${100 / BRIGHTNESS_STEPS}%`,
    width: `${100 / SATURATION_STEPS}%`,
  },
  saturationGrid: {
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 180,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  saturationHandle: {
    backgroundColor: 'transparent',
    borderColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 18,
    marginLeft: -9,
    marginTop: -9,
    position: 'absolute',
    width: 18,
  },
  scrim: {
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    padding: spacing.lg,
  },
  title: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
});
