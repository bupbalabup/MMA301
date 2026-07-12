# Track Device Marketing Presentation Script

## Opening

Xin chào thầy cô và các bạn. Hôm nay em xin giới thiệu dự án Track Device, một ứng dụng theo dõi vị trí thiết bị được xây dựng bằng React Native, Expo và Firebase.

Ý tưởng của Track Device xuất phát từ nhu cầu quản lý nhiều thiết bị di chuyển trong thực tế. Ví dụ một cá nhân hoặc một nhóm có nhiều điện thoại, xe, hoặc thiết bị cần theo dõi vị trí. Người dùng muốn biết thiết bị đang ở đâu, vừa di chuyển hay đang dừng, và lịch sử hành trình được lưu lại như thế nào.

## Problem

Nhiều ứng dụng theo dõi vị trí hiện nay yêu cầu cấu hình phức tạp, phụ thuộc mạng liên tục, hoặc không rõ dữ liệu được lưu ở đâu. Với bài toán quản lý xe thuê hoặc đội thiết bị, người quản lý cần xem nhiều thiết bị cùng lúc, biết thiết bị nào đang trực tuyến, thiết bị nào mất kết nối, và có thể xem lại hành trình sau đó.

Một vấn đề khác là dữ liệu GPS có thể không ổn định. Nếu chỉ lấy tốc độ do hệ điều hành trả về hoặc không lọc điểm GPS sai, ứng dụng có thể hiển thị tốc độ bất thường. Track Device xử lý vấn đề này bằng cách tính tốc độ từ tọa độ và thời gian, đồng thời lọc các điểm GPS bất thường.

## Solution

Track Device là ứng dụng theo dõi nhiều thiết bị trong cùng một tài khoản. Mỗi thiết bị tự ghi dữ liệu GPS của chính nó vào SQLite. Đồng thời, thiết bị cập nhật vị trí mới nhất lên Firestore để các thiết bị khác trong cùng tài khoản có thể xem.

Điểm khác biệt của dự án là cách tiếp cận local-first: dữ liệu hành trình cục bộ vẫn được giữ trên thiết bị ghi GPS, kể cả khi mất mạng. Khi có Internet, các chuyến đã hoàn thành có thể đồng bộ lên đám mây để thiết bị khác xem lịch sử và phát lại tuyến đường.

## Technology

Ứng dụng dùng React Native để xây dựng giao diện di động. Expo SDK 54 hỗ trợ location, SQLite, TaskManager và cấu hình Android/iOS. Firebase Auth xử lý đăng nhập bằng email và mật khẩu. Firestore lưu người dùng, thiết bị, vị trí realtime và lịch sử chuyến đã đồng bộ. SQLite lưu lịch sử cục bộ. Google Maps thông qua `react-native-maps` dùng cho Fleet Map và Playback.

## Demo Flow

Đầu tiên, người dùng đăng ký hoặc đăng nhập bằng email và mật khẩu. Sau khi đăng nhập, ứng dụng kiểm tra thiết lập quyền vị trí. Nếu chưa hoàn tất, Permission Wizard sẽ hướng dẫn cấp quyền vị trí, thông báo, tự khởi động và tối ưu pin trên Android, hoặc các bước tương ứng trên iOS.

Sau đó người dùng vào Dashboard. Dashboard hiển thị tổng số thiết bị, số thiết bị trực tuyến, số thiết bị mất kết nối, bản đồ nhỏ, thiết bị đang xem, tốc độ hiện tại hoặc gần nhất, trạng thái di chuyển, tọa độ và các nút đi tới Live Tracking, Fleet Map, History và Settings.

Fleet Map hiển thị nhiều thiết bị trên cùng một bản đồ. Khi chọn một marker, panel phía dưới hiển thị tên thiết bị, trạng thái kết nối, trạng thái di chuyển, tốc độ, thời gian cập nhật, tọa độ và nguồn dữ liệu.

History cho phép chọn thiết bị lịch sử. Nếu là thiết bị hiện tại, dữ liệu được đọc từ SQLite. Nếu là thiết bị từ xa, dữ liệu được đọc từ Firestore trip summaries. Khi chọn một chuyến, Trip Detail hiển thị thông tin chuyến và có thể mở Playback.

Playback phát lại tuyến đường đã ghi. Người dùng có thể phát, tạm dừng, tua về đầu, tới cuối, kéo thanh tiến trình và thay đổi tốc độ phát.

Settings cho phép đổi tên thiết bị, bật/tắt theo dõi tự động, kiểm tra quyền, mở lại wizard, vào hồ sơ tài khoản, xem thiết bị đăng nhập, quản lý thiết bị, thông báo, đồng bộ và nhật ký hoạt động.

## Tracking Demo

Khi tracking được bật, TrackingEngine nhận vị trí từ GpsEngine. Nếu thiết bị bắt đầu di chuyển, app tự tạo chuyến đi. Khi thiết bị dừng trên 30 giây, trạng thái thành Tạm dừng. Khi dừng đủ 3 phút, app xác nhận Đỗ xe và hoàn tất chuyến.

Nếu Internet mất, app vẫn ghi local vào SQLite. Vị trí realtime không thể cập nhật lên Firestore, nhưng dữ liệu cục bộ không mất. Khi mạng quay lại, các chuyến đang chờ đồng bộ có thể được gửi lên Firestore.

## Offline Demo

Khi mất Internet, Dashboard và Live Tracking dùng cache hiển thị dữ liệu gần nhất. Fleet Map không render Google Map khi offline để tránh crash. History local vẫn mở được vì đọc SQLite. Khi có mạng lại, sync có thể chạy thủ công hoặc retry một lần sau reconnect.

## Technical Highlights

- Local-first: SQLite là nguồn chính cho lịch sử thiết bị hiện tại.
- Firestore live location: chỉ lưu vị trí mới nhất, không lưu toàn bộ route.
- Cloud history: lưu trip summary và GPS chunks, mỗi chunk 150 điểm.
- Tracking engine: tự phát hiện Moving, Paused, Parking và GPS Lost.
- GPS validation: lọc điểm sai thay vì hiển thị tốc độ bị clamp.
- Offline cache: giữ dữ liệu hiển thị gần nhất.
- Foreground notification: Android native build có thông báo theo dõi khi tracking hoạt động.

## Advantages

- Theo dõi nhiều thiết bị trong cùng tài khoản.
- Không mất lịch sử local khi mất mạng.
- Có thể xem thiết bị từ xa qua Firestore.
- Có phát lại hành trình.
- Có quản lý tài khoản, thiết bị và nhật ký bảo mật.
- Giao diện mobile rõ ràng, có Dashboard và Fleet Map.

## Current Limitations

Ứng dụng chưa có backend Admin SDK nên chức năng kick thiết bị là cơ chế client-mediated qua Firestore, không phải thu hồi token Firebase toàn cục.

Theo dõi nền bền vững chưa hoàn chỉnh. TaskManager đã có, nhưng chưa tự khôi phục auth, local device và active trip khi React runtime không còn hoạt động.

Ứng dụng chưa có geofence, cảnh báo tốc độ, push notification backend, camera, dashcam, video hay AI.

## Future Development

Trong tương lai, dự án có thể phát triển geofence, cảnh báo tốc độ, thống kê đội thiết bị, quản lý xe thuê, nhắc bảo trì, phân quyền người dùng, backend bảo mật và web dashboard.

## Conclusion

Track Device là một ứng dụng theo dõi thiết bị đa nền tảng, tập trung vào local-first GPS tracking, multi-device monitoring, offline cache và lịch sử hành trình. Dự án hiện đã có nền tảng quan trọng cho một sản phẩm theo dõi thiết bị thực tế, nhưng vẫn cần runtime acceptance trên Android Development Build hoặc APK để xác nhận các hành vi native.

Em xin cảm ơn thầy cô và các bạn đã lắng nghe. Em sẵn sàng trả lời câu hỏi.

## Frequently Asked Questions

1. Ứng dụng dùng đăng nhập gì?  
Firebase Email/Password.

2. Có Google Sign-In không?  
Không.

3. Có OTP không?  
Không.

4. Có xác minh email không?  
Không có verification gate trong app hiện tại.

5. Dữ liệu hành trình lưu ở đâu?  
Local SQLite trên thiết bị ghi GPS; chuyến hoàn thành có thể đồng bộ lên Firestore.

6. Firestore có lưu từng điểm GPS thành từng document không?  
Không. Điểm GPS được gom thành chunk 150 điểm.

7. Mất mạng có ghi hành trình không?  
Có, local tracking vẫn ghi SQLite nếu GPS hoạt động.

8. Mất mạng có xem bản đồ Fleet Map không?  
Không render MapView khi offline; app hiển thị trạng thái offline.

9. Playback local có cần đồng bộ không?  
Không. Local playback đọc SQLite.

10. Remote playback lấy dữ liệu từ đâu?  
Firestore trip summary và gpsChunks.

11. Background tracking đã hoàn chỉnh chưa?  
Chưa. Đây là phần partial.

12. Android notification có dùng push không?  
Không. Nó là foreground-service notification của Expo Location.

13. iOS có notification cố định như Android không?  
Không.

14. Kick thiết bị có thu hồi Firebase token không?  
Không. Cần backend Admin SDK để làm việc đó.

15. Có thể quản lý màu marker không?  
Có trong màn Thiết bị của tôi.

16. Có thể đổi email không?  
Không.

17. Có avatar không?  
Không.

18. Có đổi mật khẩu không?  
Có, cần nhập mật khẩu hiện tại.

19. Có xóa tài khoản không?  
Không.

20. Có xóa lịch sử thiết bị khác không?  
Không.

21. Tốc độ được tính như thế nào?  
Từ khoảng cách Haversine giữa hai tọa độ liên tiếp và thời gian giữa chúng.

22. App xử lý GPS nhảy bất thường ra sao?  
Từ chối điểm invalid/spike thay vì hiển thị tốc độ bị clamp.

23. Parking sau bao lâu?  
3 phút dừng.

24. Paused sau bao lâu?  
30 giây dừng.

25. Có Google Maps không?  
Có qua `react-native-maps`.

26. Có cache không?  
Có AsyncStorage cache cho hiển thị thiết bị/live location.

27. Có SQLite không?  
Có, cho trips và gps_points.

28. Có thể xem nhiều thiết bị không?  
Có, trong Dashboard, Live Tracking và Fleet Map.

29. Có cần Android Development Build không?  
Cần để test foreground service, notification và một số quyền native.

30. Roadmap tiếp theo là gì?  
Runtime acceptance, durable background tracking, backend security, geofence và cảnh báo.
