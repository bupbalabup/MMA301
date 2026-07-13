# Kịch Bản Thuyết Trình Track Device

Tài liệu này dùng cho phần thuyết trình khoảng 12 đến 15 phút trước giảng viên, sinh viên và người chưa từng xem ứng dụng.

## 1. Giới Thiệu

Kính chào thầy cô và các bạn.

Em xin trình bày dự án Track Device, một ứng dụng theo dõi vị trí thiết bị theo thời gian thực được xây dựng bằng React Native, Expo, Firebase và SQLite.

Ý tưởng của dự án xuất phát từ một nhu cầu rất thực tế: khi một cá nhân, một nhóm hoặc một đơn vị quản lý nhiều thiết bị di chuyển, họ cần biết thiết bị đang ở đâu, có đang di chuyển không, đã đi những tuyến đường nào và dữ liệu có còn được ghi lại khi mất Internet hay không.

Track Device được xây dựng như một đồ án học tập, nhưng hướng tiếp cận được thiết kế gần với một sản phẩm thực tế: có đăng nhập, có quản lý nhiều thiết bị, có tracking GPS, có bản đồ đội thiết bị, có lịch sử hành trình, có phát lại tuyến đường và có cơ chế offline local-first.

## 2. Vấn Đề

Trong thực tế, việc theo dõi vị trí nhiều thiết bị không chỉ là mở một bản đồ và xem một chấm tọa độ. Người quản lý thường gặp các vấn đề như:

- Không biết thiết bị nào đang trực tuyến, thiết bị nào mất kết nối.
- Khi mất Internet, dữ liệu hành trình có thể bị gián đoạn.
- Lịch sử hành trình không phải lúc nào cũng có thể xem lại rõ ràng.
- Một số ứng dụng phụ thuộc quá nhiều vào cloud, nếu mạng yếu thì trải nghiệm giảm mạnh.
- Dữ liệu GPS đôi khi bị nhảy bất thường, làm tốc độ hiển thị không chính xác.
- Với bài toán xe thuê hoặc đội thiết bị, người quản lý cần xem nhiều thiết bị cùng lúc chứ không chỉ một thiết bị.

Ví dụ trong quản lý xe cho thuê, người quản lý muốn biết xe đang ở đâu, đã chạy bao xa, có dừng quá lâu hay không, và sau khi xe trả về có thể xem lại tuyến đường. Nếu ứng dụng chỉ hoạt động khi có mạng thì rất dễ mất dữ liệu ở những khu vực sóng yếu.

## 3. Giải Pháp

Track Device giải quyết bài toán bằng cách kết hợp dữ liệu cục bộ và dữ liệu đám mây.

Mỗi thiết bị tự ghi hành trình của chính nó vào SQLite. Đây là phần local-first. Nghĩa là nếu mất mạng, thiết bị vẫn có thể tiếp tục ghi dữ liệu GPS cục bộ.

Khi có Internet, thiết bị cập nhật vị trí live lên Firestore để các thiết bị khác trong cùng tài khoản có thể xem. Khi một chuyến hoàn thành, dữ liệu tóm tắt và các điểm GPS cần cho playback được đồng bộ lên Firestore theo từng chunk.

Điểm khác biệt của Track Device là app không thay thế dữ liệu local bằng cloud. SQLite vẫn là nguồn chính cho lịch sử của thiết bị hiện tại. Firestore là lớp realtime và lớp đồng bộ để xem từ xa.

## 4. Kiến Trúc Và Công Nghệ

Ứng dụng dùng React Native để xây dựng giao diện mobile và Expo SDK 54 để hỗ trợ location, SQLite, TaskManager và cấu hình build.

Firebase Auth được dùng cho đăng nhập bằng email và mật khẩu. Firestore lưu hồ sơ người dùng, danh sách thiết bị, vị trí realtime, trip summaries, GPS chunks và security logs.

SQLite lưu dữ liệu chuyến và điểm GPS trên thiết bị. Đây là phần quan trọng giúp ứng dụng vẫn có lịch sử khi mất mạng.

Google Maps thông qua `react-native-maps` được dùng cho Fleet Map và Playback. AsyncStorage được dùng để cache danh sách thiết bị, thiết bị đang chọn, thiết lập wizard và snapshot live gần nhất.

Về kiến trúc, app có các provider chính:

- AuthProvider quản lý đăng nhập.
- PermissionSetupProvider quản lý wizard và trạng thái quyền.
- DeviceProvider quản lý thiết bị cục bộ và danh sách thiết bị.
- TrackingProvider khởi tạo TrackingEngine cho thiết bị hiện tại.
- LiveDeviceProvider đọc live-location của thiết bị đang xem và fleet.
- ConnectivityProvider theo dõi trạng thái mạng.

## 5. Demo Tổng Quan Giao Diện

Đầu tiên là màn hình đăng nhập và đăng ký. Người dùng đăng ký bằng email, mật khẩu và nhập lại mật khẩu. Sau khi đăng nhập, app khởi tạo hồ sơ người dùng và thiết bị cục bộ.

Nếu thiết lập quyền chưa hoàn tất, Permission Wizard sẽ xuất hiện. Trên Android, wizard hướng dẫn quyền vị trí khi dùng ứng dụng, vị trí luôn cho phép, tự khởi động, tối ưu pin và thông báo. Trên iOS, wizard có luồng riêng phù hợp với hệ điều hành và giải thích rõ giới hạn của Expo Go với tracking nền.

Sau khi hoàn tất, người dùng vào Dashboard trong tab Trang chủ. Dashboard hiển thị tổng số thiết bị, thiết bị trực tuyến, thiết bị mất kết nối, bản đồ nhỏ, thiết bị đang chọn và các chỉ số như tốc độ, tốc độ tối đa, thời gian dừng, quãng đường hôm nay nếu có và tọa độ.

Điều hướng chính nằm ở Bottom Tab gồm Trang chủ, Bản đồ, Lịch sử và Cài đặt. Live Tracking không có tab riêng; người dùng mở chi tiết theo dõi bằng cách nhấn card tốc độ hoặc thiết bị đang xem trên Trang chủ.

## 6. Demo Tracking

Khi tracking hoạt động, GpsEngine nhận vị trí từ Expo Location. TrackingEngine kiểm tra từng điểm GPS, chuẩn hóa timestamp, tính khoảng cách Haversine giữa hai tọa độ liên tiếp và tính tốc độ theo thời gian.

Nếu thiết bị bắt đầu di chuyển, app tự tạo chuyến. Nếu thiết bị dừng trên 30 giây, trạng thái chuyển sang Tạm dừng. Nếu dừng đủ 3 phút, app xác nhận Đỗ xe và hoàn tất chuyến.

Ứng dụng không lấy tốc độ hệ điều hành trả về làm nguồn duy nhất. Tốc độ chính được tính từ tọa độ và timestamp. Các điểm GPS bất thường được từ chối thay vì hiển thị tốc độ bị giới hạn giả.

Trên Android native build, khi tracking đang chạy, app hiển thị foreground-service notification cho thiết bị cục bộ. Thông báo này hiển thị tên thiết bị, tốc độ, trạng thái kết nối và trạng thái di chuyển. Runtime trên thiết bị Android thật đã xác nhận notification vẫn cập nhật khi app ở nền; đây không phải push notification.

## 7. Demo Offline

Khi mất Internet, Track Device không reset dữ liệu hiển thị về 0. Dashboard và Live Tracking dùng cache live snapshot gần nhất để người dùng vẫn thấy tốc độ gần nhất, trạng thái di chuyển, tọa độ và thời gian cập nhật.

Fleet Map không render Google Map khi offline để tránh crash bản đồ. Thay vào đó, app hiển thị trạng thái ngoại tuyến và nút thử lại.

Quan trọng nhất, runtime trên thiết bị Android thật đã xác nhận tracking local vẫn ghi SQLite khi app chạy nền, khóa màn hình hoặc mất Internet nếu GPS vẫn hoạt động. Khi Internet quay lại, các chuyến hoàn thành đang chờ được đồng bộ lên Firestore theo luồng reconnect.

## 8. Demo Fleet Map

Fleet Map hiển thị nhiều thiết bị trong cùng tài khoản trên một bản đồ. Mỗi thiết bị có marker riêng nếu có tọa độ hợp lệ. Marker được thiết kế riêng, không dùng native pin mặc định.

Khi chọn một marker, panel thông tin hiển thị:

- Tên thiết bị.
- Thiết bị này hay thiết bị từ xa.
- Trạng thái kết nối.
- Trạng thái di chuyển.
- Tốc độ hiện tại hoặc gần nhất.
- Tốc độ tối đa.
- Thời gian dừng.
- Quãng đường hôm nay nếu có.
- Thời gian cập nhật.
- Tọa độ.
- Nguồn dữ liệu.

Điều này giúp người dùng xem nhiều thiết bị cùng lúc mà vẫn có thông tin chi tiết khi cần.

## 9. Demo History

History cho phép chọn thiết bị lịch sử. Nếu chọn thiết bị hiện tại, app đọc dữ liệu từ SQLite. Nếu chọn thiết bị từ xa, app đọc trip summaries từ Firestore.

Lịch sử được nhóm theo ngày. Mỗi ngày có tóm tắt như số chuyến, tổng quãng đường, thời lượng di chuyển, thời lượng dừng, tốc độ tối đa và số điểm GPS.

Với chuyến local chưa đồng bộ, người dùng vẫn xem được đầy đủ thông tin vì dữ liệu nằm trong SQLite. Nút đồng bộ chỉ xuất hiện cho lịch sử local và cho phép gửi các chuyến đang chờ lên Firestore khi có Internet.

## 10. Demo Playback

Playback phát lại hành trình trên bản đồ.

Nếu là chuyến local, Playback đọc điểm GPS từ SQLite. Nếu là chuyến cloud, Playback đọc trip summary và gpsChunks từ Firestore. Các điểm được chuẩn hóa timestamp, lọc tọa độ không hợp lệ, sắp xếp theo thời gian và giới hạn trong khoảng startTime đến endTime.

Người dùng có thể phát, tạm dừng, phát lại, về đầu, đến cuối, kéo thanh tiến trình và đổi tốc độ phát. Marker di chuyển theo tuyến đường, còn polyline tiến trình cho biết đoạn đã đi qua.

## 11. Demo Cài Đặt Và Tài Khoản

Settings cho phép đổi tên thiết bị, bật hoặc tắt tracking tự động, kiểm tra quyền, mở lại wizard và truy cập các phần tài khoản.

Các màn hình tài khoản gồm:

- Account Center cho tài khoản và thiết bị.
- Đổi mật khẩu ở màn riêng.
- Thiết bị đang đăng nhập ở chế độ chỉ đọc.
- Đăng xuất một thiết bị qua flow chọn phiên riêng.
- Quản lý thiết bị của tôi để đổi tên và đổi màu trên bản đồ.
- Đổi màu marker thiết bị trên bản đồ trực tiếp.
- Tuỳ chọn thông báo.
- Trạng thái đồng bộ.
- Nhật ký bảo mật.

Các thao tác nhạy cảm như đổi mật khẩu, đăng xuất một thiết bị, xóa thiết bị hoặc đăng xuất tất cả yêu cầu nhập lại mật khẩu. Tuy nhiên, vì dự án chưa có backend Admin SDK, đăng xuất thiết bị là cơ chế app-level qua Firestore, chưa phải thu hồi token Firebase toàn cục.

## 12. Ưu Điểm

Track Device có một số ưu điểm thực tế:

- Theo dõi nhiều thiết bị trong cùng tài khoản.
- Không mất lịch sử local khi mất mạng.
- Có cache để giao diện vẫn hiển thị dữ liệu gần nhất.
- Có bản đồ đội thiết bị.
- Có lịch sử theo ngày.
- Có phát lại hành trình.
- Có đồng bộ cloud theo chunk, không ghi một document cho mỗi điểm GPS.
- Có phân tách rõ thiết bị cục bộ, thiết bị đang xem và thiết bị lịch sử.
- Có kiến trúc phù hợp để mở rộng.

## 13. Khả Năng Mở Rộng

Trong tương lai, dự án có thể mở rộng:

- Geofence.
- Cảnh báo tốc độ.
- Thống kê đội thiết bị.
- Nhắc bảo trì.
- Quản lý tài xế.
- Quản lý xe thuê.
- Phân quyền người dùng.
- Web dashboard.
- Backend bảo mật với Admin SDK.
- iOS background tracking sau khi kiểm thử bằng iOS Development Build.

Những phần này hiện chưa được triển khai trong source code, nên khi demo cần nói rõ là định hướng tương lai.

## 14. Kết Luận

Track Device là một ứng dụng GPS tracking local-first, tập trung vào theo dõi nhiều thiết bị, lưu lịch sử hành trình, hỗ trợ offline và đồng bộ cloud.

Dự án đã có nền tảng kỹ thuật quan trọng: Firebase Auth, Firestore, SQLite, TrackingEngine, Fleet Map, History, Playback, Permission Wizard, cache offline và account/security UI. Android runtime đã xác nhận tracking nền, lock-screen tracking, offline recording, reconnect sync và foreground notification update. iOS background tracking vẫn cần kiểm thử riêng bằng iOS Development Build.

Em xin cảm ơn thầy cô và các bạn đã lắng nghe. Em sẵn sàng trả lời câu hỏi.

## 40 Câu Hỏi Phản Biện Và Trả Lời

1. Ứng dụng dùng cơ chế đăng nhập nào?
Ứng dụng dùng Firebase Email/Password với đăng ký, đăng nhập, đăng xuất và đổi mật khẩu.

2. Có đăng nhập bằng nhà cung cấp bên thứ ba không?
Không. Source code hiện tại chỉ hỗ trợ email và mật khẩu.

3. Có dùng mã xác thực một lần không?
Không. Dự án hiện không có luồng mã xác thực một lần.

4. Có chặn người dùng bằng bước xác thực email không?
Không. Tài khoản email/password có thể vào app sau khi đăng ký hoặc đăng nhập thành công.

5. Dữ liệu hành trình lưu ở đâu?
Thiết bị hiện tại lưu lịch sử bằng SQLite. Chuyến hoàn thành có thể đồng bộ summary và chunks lên Firestore.

6. Firestore có lưu từng điểm GPS thành từng document không?
Không. Điểm GPS được gom thành chunks, mỗi chunk khoảng 150 điểm.

7. Vì sao cần SQLite nếu đã có Firestore?
SQLite giúp app local-first, vẫn ghi được lịch sử khi mất mạng và phát lại local không phụ thuộc cloud.

8. Mất mạng có ghi GPS không?
Có, nếu GPS vẫn hoạt động thì app vẫn ghi SQLite.

9. Mất mạng có xem Fleet Map không?
Fleet Map không render Google Map khi offline. App hiển thị trạng thái ngoại tuyến để tránh crash.

10. Dashboard offline hiển thị gì?
Dashboard dùng cache gần nhất cho thiết bị và chỉ báo nguồn dữ liệu ngoại tuyến.

11. Tốc độ được tính như thế nào?
Tốc độ được tính từ khoảng cách Haversine giữa hai tọa độ liên tiếp chia cho thời gian giữa hai điểm.

12. App có dùng `location.coords.speed` không?
Có thể giữ như dữ liệu phụ, nhưng tốc độ chính trong tracking được tính từ tọa độ và timestamp.

13. App xử lý GPS spike như thế nào?
Điểm GPS bất thường bị từ chối, không lưu vào SQLite và không dùng để cập nhật tốc độ.

14. Có giới hạn cứng tốc độ không?
Không. App không biến tốc độ bất thường thành một giá trị tối đa giả; điểm sai bị loại.

15. Paused sau bao lâu?
Sau 30 giây không có chuyển động có ý nghĩa.

16. Parking sau bao lâu?
Sau 3 phút dừng.

17. Khi vào Paused có kết thúc chuyến không?
Không. Chuyến chỉ kết thúc khi đủ điều kiện Parking.

18. Playback local có cần đồng bộ không?
Không. Playback local đọc trực tiếp từ SQLite.

19. Remote playback lấy dữ liệu ở đâu?
Từ Firestore trip summary và gpsChunks.

20. Nếu cloud chunks thiếu thì sao?
App hiển thị trạng thái không có dữ liệu phù hợp, không nên crash.

21. Live Tracking khác Fleet Map thế nào?
Live Tracking tập trung vào một thiết bị đang chọn. Fleet Map hiển thị nhiều thiết bị trên cùng bản đồ.

22. `localDeviceId` là gì?
Là ID của thiết bị vật lý đang chạy app và ghi GPS.

23. `selectedDeviceId` là gì?
Là thiết bị đang được xem trong Dashboard hoặc Live Tracking.

24. `selectedHistoryDeviceId` là gì?
Là thiết bị đang được xem lịch sử trong History.

25. Chọn thiết bị từ xa có làm đổi thiết bị ghi GPS không?
Không. Ghi GPS luôn thuộc `localDeviceId`.

26. App có notification theo dõi không?
Có cho Android native build thông qua foreground-service notification của Expo Location.

27. Thông báo đó có phải push notification không?
Không. Nó là thông báo foreground service, không phải push từ server.

28. iOS có thông báo cố định giống Android không?
Không. iOS không có foreground-service notification tương đương trong source hiện tại.

29. Expo Go có kiểm thử được foreground service không?
Không đầy đủ. Cần Android Development Build hoặc EAS APK.

30. Tracking nền đã hoàn chỉnh chưa?
Trên Android, luồng nền đã được xác nhận runtime: app vẫn ghi GPS khi ở nền/khóa màn hình, offline vẫn ghi SQLite và notification vẫn cập nhật. Tuy nhiên force-stop sẽ dừng background execution, swipe-away có thể khác nhau theo hãng Android và iOS chưa được xác nhận bằng Development Build.

31. App có quản lý thiết bị đang đăng nhập không?
Có màn hình thiết bị đang đăng nhập và cơ chế app-level session flags.

32. Kick thiết bị có thu hồi token Firebase thật không?
Không. Việc này cần backend Admin SDK, hiện chưa có.

33. Có đổi tên thiết bị không?
Có. Người dùng có thể đổi tên thiết bị trong Settings hoặc quản lý thiết bị.

34. Có đổi màu marker không?
Có. Người dùng có thể đổi màu marker thiết bị trên Fleet Map và mini map bằng bảng chọn màu hoặc mã HEX. Ứng dụng không cho đổi kiểu icon marker và không đổi marker Playback.

35. Có xóa tài khoản không?
Không. Source hiện tại không có chức năng xóa tài khoản.

36. Có xóa lịch sử thiết bị khác không?
Không. Soft delete thiết bị không đồng nghĩa xóa toàn bộ lịch sử thiết bị khác.

37. App có dùng Google Maps không?
Có, thông qua `react-native-maps`, chủ yếu cho Fleet Map và Playback.

38. Có cần bảo vệ Google Maps key không?
Có. Track Device không commit key thật. Google Maps Android key được đưa vào lúc build qua biến môi trường `GOOGLE_MAPS_ANDROID_API_KEY`, và khi phát hành cần giới hạn theo package Android cùng SHA-1 certificate.

39. Dự án phù hợp mở rộng theo hướng nào?
Geofence, cảnh báo tốc độ, thống kê đội thiết bị, quản lý xe thuê, web dashboard và backend bảo mật.

40. Điểm mạnh nhất của dự án là gì?
Kiến trúc local-first kết hợp Firestore realtime, giúp app vừa ghi được dữ liệu khi offline vừa xem được nhiều thiết bị khi online.
