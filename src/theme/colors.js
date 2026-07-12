/**
 * Track Device Design System - Colors
 *
 * One import gives you the full color palette.
 * Never use raw hex strings in screens. Reference these tokens instead.
 */

const colors = {
  // -- Backgrounds ------------------------------------------------------
  /** Page background: soft cool grey */
  background: '#F4F6FA',
  /** Elevated card / input surface: pure white */
  surface: '#FFFFFF',
  /** Secondary surface for nested areas (e.g. metric tiles inside a card) */
  surfaceSecondary: '#F0F2F7',

  // -- Primary accent ----------------------------------------------------
  /** Main interactive color used on primary buttons, selected chips, active states */
  primary: '#1D6FEB',
  /** Soft tint of primary used on ghost/badge backgrounds */
  primarySoft: '#E8F0FD',

  // -- Text --------------------------------------------------------------
  /** High-emphasis text: titles, values */
  textPrimary: '#0F172A',
  /** Mid-emphasis text: labels, descriptions */
  textSecondary: '#475569',
  /** Low-emphasis text: captions, placeholders, divider labels */
  textMuted: '#94A3B8',

  // -- Borders & Dividers ------------------------------------------------
  /** Subtle dividers and card borders */
  border: '#E2E8F0',
  /** Stronger border used for active/focused inputs */
  borderStrong: '#CBD5E1',

  // -- Status: movement -------------------------------------------------
  /** Moving - green */
  moving: '#16A34A',
  /** Moving soft background */
  movingSoft: '#DCFCE7',
  /** Paused - amber */
  paused: '#D97706',
  /** Paused soft background */
  pausedSoft: '#FEF3C7',
  /** Parking - orange */
  parking: '#EA580C',
  /** Parking soft background */
  parkingSoft: '#FEE2D5',
  /** Idle - slate */
  idle: '#64748B',
  /** Idle soft background */
  idleSoft: '#F1F5F9',
  /** GPS Lost - rose/red */
  gpsLost: '#DC2626',
  /** GPS Lost soft background */
  gpsLostSoft: '#FEE2E2',

  // -- Status: connection ------------------------------------------------
  /** Online - teal/green */
  online: '#0D9488',
  /** Online soft background */
  onlineSoft: '#CCFBF1',
  /** Offline - red */
  offline: '#DC2626',
  /** Offline soft background */
  offlineSoft: '#FEE2E2',

  // -- Semantic ----------------------------------------------------------
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  info: '#1D6FEB',
  infoSoft: '#E8F0FD',

  // -- Map markers -------------------------------------------------------
  markerLocal: '#16A34A',
  markerRemote: '#1D6FEB',
  markerOffline: '#94A3B8',

  // -- Polyline ---------------------------------------------------------
  polylineBase: '#CBD5E1',
  polylineTraveled: '#1D6FEB',
};

export default colors;
