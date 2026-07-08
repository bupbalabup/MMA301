# MMA301 - Future Room

Future Room is an Expo React Native app for analyzing bedroom photos with AI and giving simple interior design recommendations.

## Team

| MSSV | Name |
|------|------|
| HE176254 | Nguyen The Huu |
| HE180536 | Dang Trung Hieu |
| HE182166 | Dinh Quoc Vuong |
| HE194925 | Bui Ngoc Dat |

## Current v1 Scope

- AI Consultant mode only
- Gallery image selection only
- Gemini AI room analysis
- Firebase Email/Password authentication
- Firestore history for logged-in users
- Favourite toggle for saved analyses
- Favourite list for logged-in users

## Important Limitations

- Camera capture is not implemented yet.
- AI Mode, Style, and Personalization screens are placeholders.
- v1 does not generate room images.
- v1 does not store images in Firebase Storage.
- Product recommendations include product name, price, website, and reason only.
- v1 does not provide direct product purchase links.
- Guest users can run analysis, but results are not saved.

## Tech Stack

- Expo
- React Native
- JavaScript
- React Navigation
- Firebase Authentication
- Cloud Firestore
- Gemini API
- Expo Image Picker
- Expo Image Manipulator

## Main Flow

1. Open the app.
2. Continue as guest or log in.
3. Pick a room image from the gallery.
4. The image is compressed before analysis.
5. Gemini returns JSON analysis.
6. The result screen displays the analysis.
7. Logged-in users have results saved to Firestore history.
8. Logged-in users can mark saved analyses as favourite.

## Environment Variables

Create a local `.env` file with:

```text
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GEMINI_API_KEY=
```

Do not commit `.env`.

## Run

```bash
npm install
npx expo start
```

## Project Structure

```text
src/
  assets/
  components/
  constants/
  context/
  firebase/
  hooks/
  navigation/
  screens/
  services/
  utils/
```

## Future Work

- Camera capture
- Full AI mode flow
- Style selection
- Personalization flow
- Guest local history
- Share result
- History detail screen
- Delete history item
- UI polish
