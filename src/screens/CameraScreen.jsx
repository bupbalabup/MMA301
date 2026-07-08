import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Toast from 'react-native-toast-message';

import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppContainer from '../components/AppContainer';
import AppText from '../components/AppText';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function CameraScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, spacing } = useTheme();
  const [message, setMessage] = useState('');

  function requireLogin() {
    navigation.navigate('Login');
  }

  function showMessage(nextMessage) {
    setMessage(nextMessage);
    Toast.show({
      type: 'info',
      text1: nextMessage,
      visibilityTime: 3000,
    });
  }

  function handleTakePhoto() {
    if (!user) {
      requireLogin();
      return;
    }

    setMessage('Camera capture is not available yet.');
  }

  async function pickImage() {
    if (!user) {
      requireLogin();
      return;
    }

    try {
      setMessage('');
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        showMessage('No image selected');
        return;
      }

      const compressedImage = await manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400 } }],
        {
          base64: true,
          compress: 0.6,
          format: SaveFormat.JPEG,
        },
      );

      if (!compressedImage.base64) {
        showMessage('No image selected');
        return;
      }

      navigation.navigate('Loading', {
        imageBase64: compressedImage.base64,
      });
    } catch (error) {
      console.error('Gallery selection failed:', error);
      showMessage(error?.message || 'Unable to select image');
    }
  }

  return (
    <AppContainer>
      <View style={styles.inner}>
        <View style={styles.header}>
          <AppText variant="heading">Take a Photo</AppText>
          <AppText variant="body" style={{ color: colors.textSecondary }}>
            Choose a photo of your room to analyze.
          </AppText>
        </View>

        <View
          style={[
            styles.placeholder,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <AppText variant="title" style={{ color: colors.textSecondary }}>
            Camera
          </AppText>
          <AppText
            variant="caption"
            style={{ color: colors.textSecondary, marginTop: spacing.sm }}
          >
            No image selected
          </AppText>
        </View>

        <AppCard>
          <AppText
            variant="caption"
            style={[styles.tipTitle, { color: colors.textSecondary }]}
          >
            Tips for best results
          </AppText>
          <View style={styles.tips}>
            {['Good lighting', 'Full room in frame', 'Avoid blurry photos'].map(
              (tip) => (
                <View
                  key={tip}
                  style={[styles.tipItem, { borderLeftColor: colors.primary }]}
                >
                  <AppText
                    variant="caption"
                    style={{ color: colors.textSecondary }}
                  >
                    {tip}
                  </AppText>
                </View>
              ),
            )}
          </View>
        </AppCard>

        {message ? (
          <AppText variant="caption" style={{ color: colors.textSecondary }}>
            {message}
          </AppText>
        ) : null}

        <View style={styles.footer}>
          <AppButton title="Take Photo" onPress={handleTakePhoto} />
          <AppButton title="Pick from Gallery" onPress={pickImage} />
        </View>
      </View>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    gap: 20,
  },
  header: {
    gap: 6,
  },
  placeholder: {
    alignItems: 'center',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingVertical: 52,
  },
  tipTitle: {
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  tips: {
    gap: 8,
  },
  tipItem: {
    borderLeftWidth: 2,
    paddingLeft: 10,
  },
  footer: {
    gap: 12,
    marginTop: 'auto',
  },
});
