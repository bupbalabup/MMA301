# Track Device

![Logo Track Device](src/assets/branding/logo-horizontal.png)

Track Device là ứng dụng theo dõi vị trí thiết bị theo thời gian thực, được xây dựng bằng React Native, Expo, Firebase và SQLite. Ứng dụng hỗ trợ theo dõi nhiều thiết bị trong cùng một tài khoản, lưu lịch sử hành trình trên thiết bị, đồng bộ hành trình đã hoàn thành lên Firestore và phát lại tuyến đường trên Google Maps.

Đây là đồ án học tập trong workspace MMA301. Mục tiêu của dự án là xây dựng một nền tảng theo dõi vị trí có kiến trúc local-first, hoạt động được khi mất mạng và vẫn có khả năng đồng bộ dữ liệu khi kết nối trở lại.

## Giới Thiệu

Track Device tập trung vào các nhu cầu chính:

- Theo dõi vị trí thiết bị theo thời gian thực.
- Quản lý nhiều thiết bị trong cùng một tài khoản Firebase.
- Ghi nhận hành trình tự động khi thiết bị di chuyển.
- Lưu dữ liệu cục bộ bằng SQLite để không mất lịch sử khi mất mạng.
- Đồng bộ hành trình đã hoàn thành lên Firestore để xem từ thiết bị khác.
- Phát lại hành trình bằng bản đồ.

Ứng dụng ưu tiên Android, đồng thời có cấu hình và một số luồng giao diện cho iOS. Một số hành vi native như foreground service, thông báo theo dõi và quyền chạy nền cần kiểm thử bằng Android Development Build hoặc EAS APK, không thể xác nhận đầy đủ chỉ bằng Expo Go.

## Tính Năng

### Đã Triển Khai

- Đăng ký bằng email và mật khẩu.
- Đăng nhập bằng email và mật khẩu.
- Đăng xuất.
- Đổi mật khẩu sau khi xác thực lại.
- Khởi tạo hồ sơ người dùng trên Firestore.
- Đăng ký thiết bị cục bộ với `localDeviceId` ổn định.
- Quản lý nhiều thiết bị trong cùng tài khoản.
- Dashboard hiển thị tổng thiết bị, thiết bị trực tuyến, thiết bị mất kết nối, bản đồ nhỏ và thông tin thiết bị đang chọn.
- Bottom Tab Navigation với bốn tab: Trang chủ, Bản đồ, Lịch sử và Cài đặt.
- Live Tracking cho thiết bị hiện tại hoặc thiết bị từ xa được chọn.
- Fleet Map hiển thị nhiều thiết bị trên một bản đồ.
- Theo dõi GPS foreground bằng `expo-location`.
- Tính tốc độ từ tọa độ GPS và timestamp.
- Lọc điểm GPS bất thường.
- Phân biệt trạng thái di chuyển, tạm dừng, đỗ xe và mất GPS.
- Tạo chuyến tự động khi có chuyển động.
- Hoàn tất chuyến tự động khi đủ thời gian đỗ xe.
- Lưu chuyến và điểm GPS bằng SQLite.
- Lịch sử hành trình theo ngày.
- Lịch sử cục bộ cho thiết bị hiện tại.
- Lịch sử đám mây cho thiết bị từ xa.
- Đồng bộ chuyến hoàn thành lên Firestore bằng trip summary và GPS chunks.
- Đồng bộ thủ công các chuyến đang chờ.
- Tự thử đồng bộ lại một lần khi có mạng trở lại.
- Màn hình chi tiết chuyến.
- Playback từ SQLite hoặc từ Firestore GPS chunks.
- Cache AsyncStorage cho danh sách thiết bị và dữ liệu live gần nhất.
- ConnectivityContext với trạng thái online, offline và checking.
- Permission Wizard cho Android và iOS.
- Thông báo foreground service cho tracking trên Android native build.
- Hồ sơ tài khoản.
- Thiết bị đang đăng nhập.
- Quản lý thiết bị của tôi.
- Đổi màu marker thiết bị trên bản đồ trực tiếp bằng bảng chọn màu và mã HEX.
- Tuỳ chọn thông báo trong ứng dụng.
- Màn hình trạng thái đồng bộ.
- Nhật ký bảo mật.
- Bộ nhận diện Track Device, icon PNG tuỳ chỉnh, illustration và marker tự vẽ.

### Đang Hoàn Thiện

- Theo dõi nền bền vững bằng TaskManager mới ở mức một phần. TaskManager đã được cấu hình, nhưng pipeline hiện tại vẫn phụ thuộc vào listener trong bộ nhớ khi xử lý vị trí nền.
- Kick thiết bị và đăng xuất tất cả thiết bị đang ở mức client-mediated qua Firestore. Dự án chưa có backend Admin SDK để thu hồi Firebase refresh token toàn cục.
- Auto Start trên Android không có API kiểm tra chung cho mọi hãng. Ứng dụng chỉ mở cài đặt phù hợp nhất và cho phép người dùng xác nhận thủ công.
- Kiểm tra tối ưu pin phụ thuộc native build và cần xác nhận trên thiết bị thật.
- Bộ ảnh chụp màn hình chính thức chưa có trong repository.

### Chưa Triển Khai

- Camera.
- Dashcam.
- Video.
- FFmpeg.
- AI.
- Chấm điểm tài xế.
- Geofence.
- Cảnh báo tốc độ.
- Nhắc bảo trì.
- Backend Admin SDK.
- Cloud Functions.
- Push notification backend.
- Khôi phục tracking nền hoàn toàn khi React runtime không còn hoạt động.

## Công Nghệ

| Nhóm | Công nghệ |
| --- | --- |
| Ứng dụng | React Native 0.81.5 |
| Framework | Expo SDK 54 |
| Điều hướng | `@react-navigation/native`, native stack, bottom tabs |
| Xác thực | Firebase Auth Email/Password |
| Cloud database | Cloud Firestore |
| Local database | `expo-sqlite` |
| Bản đồ | `react-native-maps`, Google Maps trên Android |
| Vị trí | `expo-location` |
| Tác vụ nền | `expo-task-manager` |
| Thông tin thiết bị | `expo-device`, React Native `Platform` |
| Cache | `@react-native-async-storage/async-storage` |
| Safe area | `react-native-safe-area-context` |

## Kiến Trúc

Ứng dụng được chia theo các lớp rõ ràng:

- `screens`: giao diện người dùng.
- `contexts`: trạng thái runtime dùng chung.
- `services`: Firebase, tracking, location, network, cache và thiết bị.
- `repositories`: truy vấn SQLite.
- `components`: UI dùng chung, branding, icon, marker và form.
- `utils`: định dạng, timestamp và xử lý địa lý.
- `constants`: route, tracking, history và cấu hình dùng chung.

Provider chính trong `App.js`:

```text
SafeAreaProvider
  AppBootstrap
    ConnectivityProvider
      AuthProvider
        PermissionSetupProvider
          DeviceProvider
            TrackingProvider
              LiveDeviceProvider
                RootNavigator
```

Người dùng chưa đăng nhập sẽ vào `AuthNavigator`. Người dùng đã đăng nhập sẽ đi qua Permission Wizard nếu chưa hoàn tất thiết lập, sau đó vào hệ thống chính. Điều hướng chính dùng bốn tab đúng thứ tự: Trang chủ, Bản đồ, Lịch sử và Cài đặt. Live Tracking, Trip Detail, Playback và các màn phụ vẫn nằm trong Native Stack.

## Cấu Trúc Project

```text
MMA301/
  App.js
  app.json
  eas.json
  package.json
  plugins/
    withTrackDeviceBatteryOptimization.js
  scripts/
    generate_brand_assets.ps1
  src/
    assets/
      branding/
      icons/
      illustrations/
    components/
      branding/
      icons/
      map/
      security/
      ui/
    constants/
    contexts/
    database/
      migrations/
      repositories/
    hooks/
    navigation/
    screens/
      account/
      auth/
      history/
      main/
      settings/
      setup/
      tracking/
    services/
      cache/
      device/
      firebase/
      location/
      network/
      tracking/
    theme/
    types/
    utils/
```

## Hướng Dẫn Cài Đặt

```bash
git clone <repository-url>
cd MMA301
npm install
cp .env.example .env
npx expo install @react-navigation/bottom-tabs
npx expo start
```

Chạy Android native build trong môi trường phát triển:

```bash
npx expo run:android
```

Tạo bản preview APK bằng EAS:

```bash
eas build --platform android --profile preview
```

## Build

`eas.json` có profile preview tạo APK nội bộ cho Android. Đây là lựa chọn phù hợp để kiểm thử các phần cần native build như foreground service, thông báo theo dõi và một số quyền Android.

Các bản build production cần kiểm tra lại biến môi trường, Google Maps API key, Firebase config và chính sách bảo mật trước khi phát hành.

## Biến Môi Trường

Tạo `.env` từ `.env.example` và cung cấp các biến sau:

```text
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

Lưu ý: cấu hình Google Maps Android hiện vẫn nằm trong `app.json`. Trước khi public repository hoặc phát hành production, nên chuyển key này sang cấu hình build an toàn hơn.

## Quyền Android

Ứng dụng cấu hình các quyền chính:

- `ACCESS_FINE_LOCATION`: lấy vị trí chính xác.
- `ACCESS_COARSE_LOCATION`: lấy vị trí gần đúng.
- `ACCESS_BACKGROUND_LOCATION`: chuẩn bị cho quyền vị trí nền.
- `FOREGROUND_SERVICE`: foreground service.
- `FOREGROUND_SERVICE_LOCATION`: foreground service cho vị trí.
- `POST_NOTIFICATIONS`: quyền thông báo trên Android 13 trở lên.

Permission Wizard phân biệt quyền bắt buộc và các thiết lập khuyến nghị như Auto Start hoặc tối ưu pin.

## Ảnh Giao Diện

Repository chưa có bộ ảnh chụp màn hình chính thức. Khi bổ sung ảnh, nên đặt theo cấu trúc:

```text
screenshots/dashboard.png
screenshots/live-tracking.png
screenshots/fleet-map.png
screenshots/history.png
screenshots/trip-detail.png
screenshots/playback.png
screenshots/settings.png
screenshots/permission-wizard.png
screenshots/account.png
```

## Luồng Tracking

```text
Đăng nhập thành công
Khởi tạo thiết bị cục bộ
TrackingContext khởi tạo TrackingEngine
GpsEngine nhận vị trí
TrackingEngine kiểm tra điểm GPS
Tính tốc độ từ tọa độ và thời gian
Lưu điểm hợp lệ vào SQLite
Cập nhật liveLocation/current lên Firestore nếu có mạng
Hoàn tất chuyến khi đủ điều kiện đỗ xe
Đưa chuyến vào hàng chờ đồng bộ
```

## Luồng Đồng Bộ

```text
Chuyến hoàn thành trong SQLite
Lấy điểm GPS trong khoảng startTime đến endTime
Upload trip summary lên Firestore
Upload gpsChunks với 150 điểm mỗi chunk
Đánh dấu chuyến là đã đồng bộ nếu thành công
Giữ trạng thái chờ hoặc thất bại nếu upload lỗi
Cho phép thử lại thủ công hoặc tự thử lại sau khi có mạng
```

## Chiến Lược Offline

SQLite là nguồn dữ liệu chính cho lịch sử và playback của thiết bị hiện tại. AsyncStorage lưu cache danh sách thiết bị và snapshot live-location gần nhất để giao diện vẫn có dữ liệu khi mất mạng. Khi Firestore lỗi, tracking local không bị dừng. Khi có mạng lại, các chuyến hoàn thành có thể được đồng bộ.

## Roadmap

Các hướng phát triển tiếp theo bắt đầu từ trạng thái source code hiện tại:

- Kiểm thử runtime đầy đủ trên Android Development Build hoặc EAS APK.
- Hoàn thiện tracking nền bền vững, có khả năng khôi phục auth, thiết bị và active trip trong TaskManager.
- Bổ sung backend bảo mật để thu hồi session thật sự.
- Quản lý Google Maps API key bằng cấu hình build an toàn.
- Geofence.
- Cảnh báo tốc độ.
- Thống kê đội thiết bị.
- Quy trình quản lý xe thuê hoặc tài sản di động.
- Web dashboard.

## Giấy Phép

Repository hiện chưa có file license riêng. Nếu cần công bố mã nguồn, nên bổ sung license rõ ràng, ví dụ MIT hoặc license do nhóm dự án lựa chọn.

## Tác Giả

Track Device được phát triển trong workspace MMA301 cho mục đích học tập và trình bày đồ án.
