import { colors } from '../theme';

export const DEFAULT_MARKER_COLOR = colors.primary;

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/;

export const MARKER_COLOR_PRESETS = [
  '#1D6FEB',
  '#00C2FF',
  '#22C55E',
  '#F97316',
  '#EF4444',
  '#A855F7',
  '#14B8A6',
  '#FACC15',
];

export function normalizeHexColor(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const withPrefix = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const normalized = withPrefix.toUpperCase();

  return HEX_COLOR_PATTERN.test(normalized) ? normalized : null;
}

export function isValidHexColor(value) {
  return Boolean(normalizeHexColor(value));
}

export function getSafeMarkerColor(value) {
  return normalizeHexColor(value) ?? DEFAULT_MARKER_COLOR;
}

export function hexToRgb(hexColor) {
  const normalized = getSafeMarkerColor(hexColor).slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToHex(r, g, b) {
  const toHex = (value) => {
    const bounded = Math.max(0, Math.min(255, Math.round(value)));
    return bounded.toString(16).padStart(2, '0').toUpperCase();
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hsvToHex(hue, saturation, value) {
  const h = ((hue % 360) + 360) % 360;
  const s = Math.max(0, Math.min(1, saturation));
  const v = Math.max(0, Math.min(1, value));
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = v - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (h < 60) {
    red = chroma;
    green = x;
  } else if (h < 120) {
    red = x;
    green = chroma;
  } else if (h < 180) {
    green = chroma;
    blue = x;
  } else if (h < 240) {
    green = x;
    blue = chroma;
  } else if (h < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return rgbToHex((red + match) * 255, (green + match) * 255, (blue + match) * 255);
}

export function hexToHsv(hexColor) {
  const { r, g, b } = hexToRgb(hexColor);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2);
    } else {
      hue = 60 * ((red - green) / delta + 4);
    }
  }

  return {
    hue: hue < 0 ? hue + 360 : hue,
    saturation: max === 0 ? 0 : delta / max,
    value: max,
  };
}
