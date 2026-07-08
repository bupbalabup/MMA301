import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import AppCard from '../components/AppCard';
import AppContainer from '../components/AppContainer';
import AppText from '../components/AppText';
import { auth, db } from '../firebase/firebaseConfig';
import { analyzeRoom } from '../services/geminiService';
import { useTheme } from '../context/ThemeContext';

const STEPS = [
  'Analyzing room...',
  'Checking lighting...',
  'Recognizing furniture...',
  'Finding room style...',
  'Generating recommendations...',
  'Almost done...',
];

export default function LoadingScreen({ navigation, route }) {
  const { colors, spacing } = useTheme();
  const hasStarted = useRef(false);

  useEffect(() => {
    async function runAnalysis() {
      try {
        const imageBase64 = route.params?.imageBase64;
        const mode = 'consultant';
        const result = await analyzeRoom(imageBase64, mode);

        if (auth.currentUser) {
          try {
            await addDoc(collection(db, 'analyses'), {
              userId: auth.currentUser.uid,
              roomImageBase64: imageBase64,
              mode,
              selectedStyle: null,
              personalization: null,
              result,
              isFavorite: false,
              createdAt: serverTimestamp(),
            });
          } catch (saveError) {
            // Saving history should not block showing the AI result.
          }
        }

        navigation.replace('Result', { result, imageBase64 });

      } catch (error) {
        navigation.replace('Result', {
          result: {
            success: false,
            message: error.message,
          },
        });
      }
    }

    if (!hasStarted.current) {
      hasStarted.current = true;
      runAnalysis();
    }
  }, [navigation, route.params?.imageBase64]);

  return (
    <AppContainer>
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="heading" style={{ textAlign: 'center' }}>
            Analyzing your room
          </AppText>
          <AppText
            variant="body"
            style={{ color: colors.textSecondary, textAlign: 'center' }}
          >
            This may take a moment...
          </AppText>
        </View>

        {/* Spinner Placeholder */}
        <View style={styles.spinnerArea}>
          <AppText style={styles.spinnerEmoji}>🔍</AppText>
        </View>

        {/* Steps Card */}
        <AppCard>
          <AppText
            variant="caption"
            style={[styles.stepsTitle, { color: colors.textSecondary }]}
          >
            Steps
          </AppText>
          <View style={styles.steps}>
            {STEPS.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={[styles.stepBadge, { backgroundColor: colors.primary + '18' }]}>
                  <AppText variant="small" style={{ color: colors.primary, fontWeight: '700' }}>
                    {index + 1}
                  </AppText>
                </View>
                <AppText variant="caption" style={{ color: colors.textSecondary }}>
                  {step}
                </AppText>
              </View>
            ))}
          </View>
        </AppCard>
      </View>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    gap: 28,
    justifyContent: 'center',
  },
  header: {
    gap: 8,
  },
  spinnerArea: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  spinnerEmoji: {
    fontSize: 56,
    textAlign: 'center',
  },
  stepsTitle: {
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  steps: {
    gap: 12,
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  stepBadge: {
    alignItems: 'center',
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
});
