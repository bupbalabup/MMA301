import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import AppCard from '../components/AppCard';
import AppContainer from '../components/AppContainer';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase/firebaseConfig';
import { analyzeRoom } from '../services/geminiService';

const REQUEST_TIMEOUT_MS = 30000;

const STEPS = [
  'Analyzing room...',
  'Checking lighting...',
  'Recognizing furniture...',
  'Finding room style...',
  'Generating recommendations...',
  'Almost done...',
];

function getErrorMessage(error) {
  const rawMessage = error?.message || '';
  const lowerMessage = rawMessage.toLowerCase();

  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return 'Request timeout';
  }

  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('failed to fetch')
  ) {
    return 'Network error';
  }

  return rawMessage || 'Unable to analyze room. Please try again.';
}

function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout'));
      }, REQUEST_TIMEOUT_MS);
    }),
  ]);
}

export default function LoadingScreen({ navigation, route }) {
  const { colors } = useTheme();
  const hasStarted = useRef(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function runAnalysis() {
      const imageBase64 = route.params?.imageBase64;
      const mode = 'consultant';

      try {
        if (!imageBase64) {
          throw new Error('No image selected');
        }

        const result = await withTimeout(analyzeRoom(imageBase64, mode));

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
            console.error('Saving analysis failed:', saveError);
          }
        }

        navigation.replace('Result', { result, imageBase64 });
      } catch (error) {
        console.error('Room analysis failed:', error);
        const nextErrorMessage = error?.message || getErrorMessage(error);
        setErrorMessage(nextErrorMessage);

        setTimeout(() => {
          navigation.replace('Result', {
            result: {
              success: false,
              message: nextErrorMessage,
            },
            imageBase64,
          });
        }, 1200);
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
        <View style={styles.header}>
          <AppText variant="heading" style={{ textAlign: 'center' }}>
            {errorMessage ? 'Analysis Error' : 'Analyzing...'}
          </AppText>
          <AppText
            variant="body"
            style={{ color: colors.textSecondary, textAlign: 'center' }}
          >
            {errorMessage || 'This may take a moment...'}
          </AppText>
        </View>

        <View style={styles.spinnerArea}>
          <AppText variant="title" style={{ color: colors.textSecondary }}>
            {errorMessage ? 'Error' : 'Analyzing'}
          </AppText>
        </View>

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
                <View
                  style={[
                    styles.stepBadge,
                    { backgroundColor: colors.primary + '18' },
                  ]}
                >
                  <AppText
                    variant="small"
                    style={{ color: colors.primary, fontWeight: '700' }}
                  >
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
