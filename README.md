# Track Device

Track Device is a React Native Expo app that turns an Android phone into an automatic GPS tracker. MVP 1 tracks foreground GPS, automatically detects trips, stores GPS data locally in SQLite, and publishes the latest live location to Firestore when online.

MVP 1 does not include dashcam, camera, video recording, FFmpeg, or AI.

## Tech Stack

- React Native
- Expo SDK 54
- Firebase Authentication
- Cloud Firestore
- SQLite
- react-native-maps
- expo-location

## MVP 1 Capabilities

- User login and registration.
- Device selection or creation.
- Multiple devices under one Firebase account.
- Remote device realtime viewer mode through Firestore live location.
- Auto tracking while the app is active and tracking is enabled.
- Automatic trip creation when movement starts.
- Automatic trip completion when parking is detected.
- SQLite storage for trips and GPS points.
- Firestore live location updates.
- Completed local trip history sync to Firestore summaries and GPS chunks.
- Offline-tolerant local GPS storage.
- Trip history grouped by date for local and remote account devices.
- Local and remote trip playback on a map.

SQLite remains the local source of truth on the recording phone. Completed trips are uploaded to Firestore so another device under the same account can view remote history and playback without writing to that remote device.

## Folder Structure

```text
src/
  components/
  constants/
  contexts/
  database/
    migrations/
    repositories/
  hooks/
  navigation/
  screens/
  services/
    firebase/
    location/
    tracking/
  types/
  utils/
```

## Installation

Prerequisites:

- Node.js 20 or newer.
- npm.
- Expo CLI through `npx`.
- Android Studio or an Android device with Expo Go/development build support.
- A Firebase project with Email/Password Authentication and Cloud Firestore enabled.

```bash
npm install
```

Do not install camera, video, FFmpeg, or AI packages for MVP 1.

## Environment

Create a local `.env` file from `.env.example` and fill in the Firebase web app values:

```bash
cp .env.example .env
```

Required variables:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

## Run

```bash
npx expo start
```

Use a physical Android device for GPS validation when possible. Emulators can run the app, but real-device testing is recommended for permission prompts, GPS accuracy, and movement behavior.

Expo Go is useful for quick UI checks, but standalone APK testing is required for realistic offline, Firebase, and Android permission behavior. The preview APK profile is configured in `eas.json`.

```bash
eas build --platform android --profile preview
```

## Roadmap

- MVP 1: automatic GPS tracker with auto trip detection.
- MVP 2: dashcam and local-only video only after explicit approval.
- MVP 3: sync, exports, and analytics.
- MVP 4: advanced monitoring and intelligence.

## Sprint 18 Runtime Experience

- Dashboard shows account device counts and a connectivity-aware mini map.
- Device metadata and last-known live display values are cached in AsyncStorage.
- Dashboard and Fleet Map do not mount map views while reachability is offline or unknown.
- Local pending trips remain available and playable from SQLite without cloud sync.
- Manual pending-trip sync reports progress immediately; one guarded retry runs when Internet returns.
- A first-run platform-specific wizard prepares location permission and provides truthful system-setting guidance.
- Android Development Build/APK can show a persistent local-device tracking notification through Expo Location foreground service while tracking is active.

Background location permission does not implement background tracking. MVP 1 still
tracks only while the app is active. Auto Start and battery optimization are
manufacturer-dependent settings that the user must check manually.

On iOS, Auto Start and battery-optimization steps are omitted. Expo Go cannot run
background location; use a Development Build or installed application for later
background-location testing. The Android foreground-service task is included for
active local tracking, but full background behavior still requires real-device
runtime acceptance.

Expo Go is not an acceptance environment for Android foreground-service
notifications. Use an Android Development Build or EAS APK to validate the
persistent live tracking notification.

The current Android location task forwards updates to the in-memory tracking
pipeline while the JavaScript runtime is available. It does not yet restore auth,
local device, or active-trip context by itself, so full durable background GPS
persistence remains pending runtime design and acceptance.

## Sprint 19 Visual Identity

Track Device uses the Connected Waypoint identity: a device node connected to a
map waypoint and neighboring device nodes. Vector masters are stored in
`src/assets/branding`; Expo-ready PNG exports, functional icons, and empty-state
illustrations live under `src/assets`. Run
`scripts/generate_brand_assets.ps1` after changing the deterministic master design.

Custom Track Device icons are allowed, while external icon libraries, emoji,
decorative Unicode symbols, copied brand assets, and native map pins remain banned.
Sprint 18 has completed code and static review, but real Android/iOS runtime
acceptance is still pending. Background tracking is not implemented.

## Sprint 18.2 Recovery

- Email/password registration requires matching passwords.
- Authenticated Firebase users enter the app directly after profile/device initialization.
- Local pending trips remain playable from SQLite and use the explicit `local` navigation source.
- History derives its pending count and card labels from the same normalized local trips.
- Playback information is rendered outside `MapView`; native callouts are not used for long content.
- Device titles use custom name, detected physical name, model, then platform fallback. Technical IDs are not normal titles.
- Stopped duration and lost-connection duration are separate values. Last-known display data remains cached offline.
