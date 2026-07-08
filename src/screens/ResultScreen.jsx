import { Image, ScrollView, StyleSheet, View } from 'react-native';

import AppCard from '../components/AppCard';
import AppContainer from '../components/AppContainer';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';

// Priority badge colours
const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
};

const PRIORITY_LABELS = {
  high: 'High',
  medium: 'Med',
  low: 'Low',
};

// Score sub-criteria to display
const SCORE_KEYS = [
  { key: 'lighting', label: 'Lighting' },
  { key: 'layout', label: 'Layout' },
  { key: 'color', label: 'Color' },
  { key: 'decoration', label: 'Decoration' },
  { key: 'storage', label: 'Storage' },
];

function ScoreBar({ label, value, colors }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  const barColor =
    pct >= 80 ? colors.success : pct >= 60 ? colors.accent : colors.danger;

  return (
    <View style={styles.scoreBarRow}>
      <AppText variant="caption" style={styles.scoreBarLabel}>
        {label}
      </AppText>
      <View style={[styles.scoreBarTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.scoreBarFill,
            { width: `${pct}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <AppText
        variant="caption"
        style={[styles.scoreBarValue, { color: colors.textSecondary }]}
      >
        {pct}
      </AppText>
    </View>
  );
}

function PriorityBadge({ priority, colors }) {
  const bg = PRIORITY_COLORS[priority] || colors.border;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <AppText variant="small" style={styles.badgeText}>
        {PRIORITY_LABELS[priority] || priority}
      </AppText>
    </View>
  );
}

export default function ResultScreen({ route }) {
  const { colors, spacing } = useTheme();
  const result = route.params?.result || {};

  // Error / failure state
  if (!result.success) {
    return (
      <AppContainer>
        <View style={styles.errorWrap}>
          <AppText variant="hero" style={{ textAlign: 'center' }}>
            😕
          </AppText>
          <AppText variant="title" style={{ textAlign: 'center', marginTop: spacing.md }}>
            Analysis failed
          </AppText>
          <AppText
            variant="body"
            style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }}
          >
            {result.message || 'Unable to analyze room. Please try again.'}
          </AppText>
        </View>
      </AppContainer>
    );
  }

  const analysis = result.analysis || {};
  const score = analysis.roomScore || {};
  const recommendations = result.recommendations || [];
  const products = result.products || [];

  return (
    <AppContainer style={styles.outerContainer}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO IMAGE ───────────────────────────────────── */}
        {route.params?.imageBase64 ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${route.params.imageBase64}` }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: colors.border }]}>
            <AppText variant="hero" style={{ textAlign: 'center' }}>
              🏠
            </AppText>
          </View>
        )}

        {/* ── OVERALL SCORE ────────────────────────────────── */}
        <View style={[styles.scoreHero, { backgroundColor: colors.primary }]}>
          <AppText
            variant="caption"
            style={{ color: 'rgba(255,255,255,0.75)', letterSpacing: 1.2 }}
          >
            ROOM SCORE
          </AppText>
          <AppText style={styles.scoreBig}>
            {score.overall ?? '--'}
          </AppText>
          <AppText
            variant="caption"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            out of 100
          </AppText>
        </View>

        {/* Style Tags */}
        <View style={styles.styleTags}>
          {analysis.currentStyle ? (
            <View style={[styles.styleTag, { backgroundColor: colors.border }]}>
              <AppText variant="caption" style={{ color: colors.textSecondary }}>
                Current: {analysis.currentStyle}
              </AppText>
            </View>
          ) : null}
          {analysis.recommendedStyle ? (
            <View style={[styles.styleTag, { backgroundColor: colors.primary + '18' }]}>
              <AppText variant="caption" style={{ color: colors.primary }}>
                → {analysis.recommendedStyle}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* ── ANALYSIS SUMMARY ─────────────────────────────── */}
        {analysis.summary ? (
          <View style={[styles.section, { marginTop: spacing.lg }]}>
            <AppText variant="title" style={styles.sectionTitle}>
              Analysis
            </AppText>
            <AppCard>
              <AppText variant="body" style={{ color: colors.text, lineHeight: 24 }}>
                {analysis.summary}
              </AppText>
            </AppCard>
          </View>
        ) : null}

        {/* ── SCORE BREAKDOWN ──────────────────────────────── */}
        <View style={[styles.section, { marginTop: spacing.lg }]}>
          <AppText variant="title" style={styles.sectionTitle}>
            Score Breakdown
          </AppText>
          <AppCard>
            <View style={styles.scoreList}>
              {SCORE_KEYS.map(({ key, label }) => (
                <ScoreBar
                  key={key}
                  label={label}
                  value={score[key]}
                  colors={colors}
                />
              ))}
            </View>
          </AppCard>
        </View>

        {/* ── RECOMMENDATIONS ──────────────────────────────── */}
        {recommendations.length > 0 && (
          <View style={[styles.section, { marginTop: spacing.lg }]}>
            <AppText variant="title" style={styles.sectionTitle}>
              Recommendations
            </AppText>
            <View style={styles.cardList}>
              {recommendations.map((rec, index) => (
                <AppCard key={index}>
                  <View style={styles.recHeader}>
                    <AppText
                      variant="body"
                      style={[styles.recTitle, { color: colors.text }]}
                    >
                      {rec.title}
                    </AppText>
                    {rec.priority ? (
                      <PriorityBadge priority={rec.priority} colors={colors} />
                    ) : null}
                  </View>
                  {rec.description ? (
                    <AppText
                      variant="caption"
                      style={{ color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 20 }}
                    >
                      {rec.description}
                    </AppText>
                  ) : null}
                </AppCard>
              ))}
            </View>
          </View>
        )}

        {/* ── PRODUCTS ─────────────────────────────────────── */}
        {products.length > 0 && (
          <View style={[styles.section, { marginTop: spacing.lg }]}>
            <AppText variant="title" style={styles.sectionTitle}>
              Suggested Products
            </AppText>
            <View style={styles.cardList}>
              {products.map((product, index) => (
                <AppCard key={index}>
                  <View style={styles.productRow}>
                    <View style={styles.productInfo}>
                      <AppText
                        variant="body"
                        style={{ color: colors.text, fontWeight: '600' }}
                      >
                        {product.title}
                      </AppText>
                      {product.reason ? (
                        <AppText
                          variant="caption"
                          style={{ color: colors.textSecondary, marginTop: 2, lineHeight: 18 }}
                        >
                          {product.reason}
                        </AppText>
                      ) : null}
                    </View>
                    <View style={styles.productMeta}>
                      {product.price ? (
                        <AppText
                          variant="caption"
                          style={{ color: colors.primary, fontWeight: '600' }}
                        >
                          {Number(product.price).toLocaleString('vi-VN')}₫
                        </AppText>
                      ) : (
                        <AppText variant="caption" style={{ color: colors.textSecondary }}>
                          Liên hệ giá
                        </AppText>
                      )}
                      {product.website ? (
                        <AppText
                          variant="small"
                          style={{ color: colors.textSecondary, marginTop: 2 }}
                        >
                          {product.website}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                </AppCard>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    padding: 0,
  },
  scroll: {
    paddingBottom: 32,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },

  // Hero image
  heroImage: {
    height: 240,
    width: '100%',
  },
  heroPlaceholder: {
    alignItems: 'center',
    height: 200,
    justifyContent: 'center',
    width: '100%',
  },

  // Overall score
  scoreHero: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  scoreBig: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 64,
  },

  // Style tags
  styleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  styleTag: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  // Sections
  section: {
    gap: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  cardList: {
    gap: 10,
  },

  // Score bars
  scoreList: {
    gap: 12,
  },
  scoreBarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  scoreBarLabel: {
    width: 76,
  },
  scoreBarTrack: {
    borderRadius: 999,
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  scoreBarFill: {
    borderRadius: 999,
    height: '100%',
  },
  scoreBarValue: {
    textAlign: 'right',
    width: 28,
  },

  // Recommendations
  recHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  recTitle: {
    flex: 1,
    fontWeight: '600',
  },

  // Priority badge
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Products
  productRow: {
    flexDirection: 'row',
    gap: 12,
  },
  productInfo: {
    flex: 1,
  },
  productMeta: {
    alignItems: 'flex-end',
  },
});
