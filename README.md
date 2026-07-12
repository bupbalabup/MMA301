# Track Device

![Track Device logo](src/assets/branding/logo-horizontal.png)

Track Device is a React Native + Expo GPS tracking application for monitoring one or more devices under the same Firebase account. The app records trips automatically on the local physical device, shows realtime device status through Firestore, supports local and cloud trip history, and provides route playback on Google Maps.

The source currently targets Expo SDK 54, Android first, with iOS support present in configuration and UI flows. Runtime acceptance for several Android system behaviors still requires an Android Development Build or EAS APK.

## Implemented Features

- Firebase Email/Password authentication with register, login, logout, and password change.
- User profile document initialization in Firestore.
- Local device registration with stable `localDeviceId` stored in AsyncStorage.
- Multi-device account list from Firestore.
- Dashboard with device counts, selected-device summary, current speed, max speed, stopped duration, today's distance, and mini map.
- Live Tracking screen for local or selected remote device.
- Fleet Map with all account devices that have valid live coordinates.
- Automatic foreground GPS tracking through `expo-location`.
- Coordinate-based speed calculation and GPS spike filtering.
- Moving, Paused, Parking, GPS Lost, Online, and Offline state display.
- Automatic trip creation and completion.
- SQLite local trip and GPS point storage.
- History grouped by date for local SQLite history and remote Firestore history.
- Completed-trip cloud sync to Firestore trip summaries and GPS chunks.
- Manual pending-trip sync and guarded retry after reconnect.
- Trip Detail screen for local and cloud summaries.
- Playback screen for local SQLite GPS points and remote Firestore GPS chunks.
- AsyncStorage cache for device list and last-known live-location snapshots.
- Connectivity context with online, offline, and checking states.
- Android permission/setup wizard with foreground location, background permission readiness, notification permission, Auto Start guidance, and battery optimization guidance.
- iOS permission/setup flow with foreground location, always-location prompt, notification guidance, and truthful background limitations.
- Android foreground-service location task and persistent tracking notification in Development Build/APK environments.
- Account and Security screens for profile, password change, signed-in devices, device preferences, notification preferences, sync status, and security logs.
- Track Device branding assets, custom PNG icons, illustrations, and code-drawn map markers.

## Partial or Limited Features

- Android foreground service is wired through Expo Location and TaskManager, but durable background tracking is not fully accepted because the task forwards locations to the in-memory GPS listener pipeline and does not restore auth, `localDeviceId`, or active-trip state independently.
- Per-device kick and logout-all are client-mediated through Firestore device-session flags. They do not revoke Firebase Auth refresh tokens globally because there is no Admin SDK backend.
- Auto Start cannot be verified by a universal Android API. The app opens best-effort settings and can store manual user confirmation.
- Battery optimization status uses the configured native plugin path, but final behavior must be verified in an Android Development Build or APK.
- No production screenshot set exists in the repository yet.

## Not Implemented

- Camera, dashcam, video, FFmpeg, AI, driver scoring, geofencing, speed alerts, maintenance reminders, backend Admin SDK, Cloud Functions, push notification backend, and fully durable background GPS restoration.

## Screenshots

Place runtime screenshots in a future `screenshots/` directory:

- `screenshots/dashboard.png`
- `screenshots/live-tracking.png`
- `screenshots/fleet-map.png`
- `screenshots/history.png`
- `screenshots/trip-detail.png`
- `screenshots/playback.png`
- `screenshots/settings.png`
- `screenshots/permission-wizard.png`
- `screenshots/account.png`

## Tech Stack

| Area | Technology |
| --- | --- |
| App runtime | React Native 0.81.5, React 19.1.0 |
| Framework | Expo SDK 54 |
| Navigation | `@react-navigation/native`, native stack |
| Auth | Firebase Auth Email/Password |
| Cloud database | Cloud Firestore |
| Local database | `expo-sqlite` |
| Maps | `react-native-maps` / Google Maps on Android |
| Location | `expo-location` |
| Background task primitive | `expo-task-manager` |
| Device metadata | `expo-device`, React Native `Platform` |
| Local storage/cache | `@react-native-async-storage/async-storage` |
| Safe area | `react-native-safe-area-context` |

## Folder Structure

```text
Track Device
├── App.js
├── app.json
├── eas.json
├── package.json
├── plugins/
│   └── withTrackDeviceBatteryOptimization.js
├── scripts/
│   └── generate_brand_assets.ps1
└── src/
    ├── assets/
    │   ├── branding/
    │   ├── icons/
    │   └── illustrations/
    ├── components/
    │   ├── branding/
    │   ├── icons/
    │   ├── map/
    │   ├── security/
    │   └── ui/
    ├── constants/
    ├── contexts/
    ├── database/
    │   ├── migrations/
    │   └── repositories/
    ├── hooks/
    ├── navigation/
    ├── screens/
    │   ├── account/
    │   ├── auth/
    │   ├── history/
    │   ├── main/
    │   ├── settings/
    │   ├── setup/
    │   └── tracking/
    ├── services/
    │   ├── cache/
    │   ├── device/
    │   ├── firebase/
    │   ├── location/
    │   ├── network/
    │   └── tracking/
    ├── theme/
    ├── types/
    └── utils/
```

## Installation

```bash
git clone <repository-url>
cd MMA301
npm install
cp .env.example .env
npx expo start
```

For native Android behavior:

```bash
npx expo run:android
eas build --platform android --profile preview
```

The `preview` EAS profile builds an internal APK.

## Environment Variables

Create `.env` from `.env.example` and provide:

```text
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

The current `app.json` also contains Android Google Maps configuration. That key should be moved to build-time configuration before public distribution.

## Android Permissions

The app requests or configures:

- `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` for foreground GPS.
- `ACCESS_BACKGROUND_LOCATION` for background-location readiness.
- `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_LOCATION` for Android foreground-service location updates.
- `POST_NOTIFICATIONS` for Android 13+ notification permission.

The permission wizard distinguishes required location/notification checks from recommended Auto Start and battery optimization guidance.

## Provider Architecture

Actual provider order in `App.js`:

```text
SafeAreaProvider
  AppBootstrap
    ConnectivityProvider
      AuthProvider
        PermissionSetupProvider       only after authentication
          DeviceProvider              only after setup is complete
            TrackingProvider
              LiveDeviceProvider
                RootNavigator
```

Unauthenticated users enter `AuthNavigator`. Authenticated users pass through `PermissionSetupProvider`; if setup is incomplete, the wizard renders before the main app providers mount.

## Tracking Flow

```text
Auth ready
DeviceContext resolves localDeviceId
TrackingContext initializes TrackingEngine with uid + localDeviceId
TrackingContext auto-enables tracking
GpsEngine starts foreground GPS watching
TrackingEngine validates GPS points
TrackingEngine calculates speed from consecutive accepted points
TrackingEngine creates or updates an active SQLite trip
TrackingEngine publishes liveLocation/current when Firestore is reachable
Parking completion finalizes the trip and queues cloud sync
```

## Sync Flow

```text
Completed local SQLite trip
Load bounded GPS points between trip.startTime and trip.endTime
Upload Firestore trip summary
Upload GPS chunks of 150 points each
Mark local trip cloudSyncStatus as synced
If upload fails, mark failed and keep SQLite data
Retry manually from History/Sync screen or once after reconnect
```

## Offline Strategy

SQLite remains the source of truth for local trip history and local playback. AsyncStorage caches the device list and last-known live-location display snapshots for offline UI. Firestore failures do not stop local GPS processing. When connectivity returns, pending completed trips can be retried.

## Current Roadmap

- Runtime acceptance on Android Development Build / EAS APK.
- Durable background tracking that restores auth/device/trip context inside the TaskManager pipeline.
- Backend-based session revocation and stronger device ownership checks.
- Secure build-time Google Maps key management.
- Geofencing, speed alerts, statistics, and fleet/rental workflows.

## License

No license file is currently present in the repository.

## Author

Track Device is maintained as part of the MMA301 project workspace.
