# Kịch bản thuyết trình Marketing - Track Device

Đối tượng: giảng viên đại học, sinh viên, và người chưa từng xem ứng dụng.  
Thời lượng dự kiến: 12-15 phút.  
Phong cách: tiếng Việt tự nhiên, chuyên nghiệp, dễ hiểu.

---

## 1. Opening - Mở đầu

Kính chào quý thầy cô và các bạn.

Em xin tự giới thiệu, em là người thực hiện dự án Track Device. Hôm nay em xin trình bày về một ứng dụng theo dõi vị trí thiết bị theo thời gian thực, được xây dựng bằng React Native, Expo, Firebase, SQLite và Google Maps.

Tên dự án là Track Device.

Lý do em xây dựng dự án này xuất phát từ một nhu cầu rất thực tế: trong nhiều tình huống, chúng ta cần biết một thiết bị hoặc một phương tiện đang ở đâu, đã di chuyển như thế nào, và lịch sử hành trình ra sao. Ví dụ như quản lý xe cho thuê, theo dõi nhân viên giao hàng, quản lý xe gia đình, hoặc đơn giản là theo dõi một thiết bị đang được sử dụng ở ngoài đường.

Tuy nhiên, nhiều giải pháp hiện nay hoặc quá phức tạp, hoặc phụ thuộc hoàn toàn vào Internet, hoặc chỉ hiển thị vị trí hiện tại nhưng không lưu lại hành trình một cách rõ ràng. Vì vậy, Track Device được xây dựng với mục tiêu đơn giản hơn: tự động theo dõi, lưu dữ liệu cục bộ an toàn, đồng bộ khi có mạng, và cho phép xem lại hành trình sau đó.

Trong phần trình bày hôm nay, em sẽ đi qua vấn đề, giải pháp, công nghệ sử dụng, demo các màn hình chính, demo tình huống mất mạng, các điểm kỹ thuật nổi bật, lợi ích thực tế và hướng phát triển tiếp theo.

---

## 2. The Problem - Vấn đề

Trước khi nói về Track Device, em xin nói về vấn đề thực tế.

Hiện nay, các ứng dụng theo dõi GPS có khá nhiều, nhưng khi đưa vào các bài toán quản lý thực tế thì vẫn có một số bất tiện.

Thứ nhất, nhiều ứng dụng yêu cầu người dùng thao tác thủ công quá nhiều. Ví dụ phải bấm bắt đầu chuyến đi, bấm kết thúc chuyến đi, hoặc tự lưu lại hành trình. Với người dùng bình thường, việc này dễ bị quên. Với tài xế hoặc người đang di chuyển, việc thao tác thủ công còn gây mất tập trung.

Thứ hai, nhiều ứng dụng phụ thuộc mạnh vào Internet. Khi mất mạng, ứng dụng có thể không cập nhật được vị trí, không lưu được dữ liệu, hoặc giao diện chuyển sang trạng thái trống. Nhưng trong thực tế, xe vẫn đang chạy, thiết bị vẫn đang di chuyển, và dữ liệu GPS vẫn rất quan trọng. Nếu chỉ vì mất mạng mà mất hành trình thì hệ thống không đáng tin cậy.

Thứ ba, trong quản lý xe cho thuê hoặc quản lý đội xe nhỏ, người quản lý thường cần biết nhiều thông tin cùng lúc: xe nào đang online, xe nào mất kết nối, xe nào đang di chuyển, xe nào đang đỗ, hôm nay xe đã đi bao xa, tốc độ hiện tại là bao nhiêu, và sau đó có thể xem lại tuyến đường đã đi. Nếu dữ liệu bị phân tán hoặc chỉ xem được từng thiết bị riêng lẻ thì việc quản lý rất mất thời gian.

Thứ tư, lịch sử hành trình thường khó xem. Một số hệ thống chỉ lưu vị trí hiện tại, không có bản đồ phát lại. Một số hệ thống có lịch sử nhưng không phân nhóm theo ngày, không tách chuyến đi rõ ràng, hoặc không thể xem lại khi thiết bị hiện tại không có mạng.

Tóm lại, bài toán đặt ra là:

- Làm sao để theo dõi GPS tự động, ít thao tác?
- Làm sao để dữ liệu không mất khi mất Internet?
- Làm sao để xem được nhiều thiết bị trên cùng một tài khoản?
- Làm sao để xem lịch sử và phát lại hành trình một cách trực quan?
- Và làm sao để ứng dụng đủ đơn giản để người dùng phổ thông có thể sử dụng?

Đó là lý do Track Device được xây dựng.

---

## 3. The Solution - Giải pháp

Track Device là một ứng dụng theo dõi vị trí thiết bị theo hướng local-first, nghĩa là dữ liệu quan trọng được lưu trước trên thiết bị, sau đó mới đồng bộ lên đám mây khi có Internet.

Ý tưởng chính của Track Device là biến điện thoại thành một thiết bị GPS tracker. Sau khi người dùng đăng nhập và thiết lập quyền vị trí, ứng dụng có thể tự động ghi nhận vị trí, tự phát hiện khi thiết bị di chuyển, tạm dừng, đỗ xe, mất GPS hoặc mất kết nối mạng.

Điểm khác biệt của Track Device nằm ở ba ý chính.

Thứ nhất, ứng dụng không đặt trọng tâm vào việc người dùng bấm bắt đầu hoặc kết thúc chuyến đi. Hành trình được phát hiện tự động dựa trên chuyển động GPS. Khi thiết bị bắt đầu di chuyển, hệ thống tạo chuyến đi. Khi thiết bị dừng đủ lâu, hệ thống hoàn thành chuyến đi.

Thứ hai, dữ liệu GPS được lưu vào SQLite trên thiết bị trước. Điều này giúp ứng dụng vẫn hoạt động khi mất mạng. Khi Internet quay lại, các chuyến đi đang chờ sẽ được đồng bộ lên Firestore.

Thứ ba, cùng một tài khoản có thể quản lý nhiều thiết bị. Người dùng có thể xem Dashboard tổng quan, xem bản đồ tất cả thiết bị, xem thiết bị nào đang trực tuyến hoặc mất kết nối, và xem lịch sử của thiết bị local hoặc thiết bị từ xa.

Track Device không cố gắng trở thành một hệ thống quá lớn ngay từ đầu. MVP 1 tập trung vào những phần cốt lõi nhất: theo dõi vị trí, lưu hành trình, xem bản đồ, đồng bộ đám mây, và hỗ trợ offline.

---

## 4. Technology - Công nghệ sử dụng

Em xin giải thích đơn giản các công nghệ chính trong dự án.

Đầu tiên là React Native. Đây là framework giúp xây dựng ứng dụng di động bằng JavaScript và React. Lợi ích là có thể phát triển giao diện mobile nhanh hơn, đồng thời vẫn có thể chạy trên Android và iOS.

Thứ hai là Expo. Expo cung cấp môi trường phát triển cho React Native, hỗ trợ build, chạy thử, dùng các API như vị trí, thiết bị, quyền hệ thống, và task nền. Trong dự án này, Expo giúp giảm bớt phần cấu hình native phức tạp.

Thứ ba là Firebase Authentication. Đây là phần đăng ký, đăng nhập và đăng xuất. Track Device hiện dùng email và mật khẩu. Người dùng đăng ký xong có thể vào app trực tiếp, không có email verification gate.

Thứ tư là Firestore. Firestore là database đám mây dùng để lưu thông tin tài khoản, danh sách thiết bị, vị trí live hiện tại, và lịch sử chuyến đi đã đồng bộ. Firestore phù hợp cho realtime update, nên rất hữu ích cho Fleet Map và Live Tracking.

Thứ năm là SQLite. Đây là database cục bộ trên điện thoại. Track Device dùng SQLite để lưu trips và gps_points. Đây là dữ liệu gốc của hành trình local. Nếu mất mạng, SQLite vẫn ghi được dữ liệu GPS.

Thứ sáu là Google Maps thông qua react-native-maps. Ứng dụng dùng bản đồ để hiển thị vị trí thiết bị, tuyến đường đã đi, marker tùy chỉnh, và playback hành trình.

Cuối cùng là expo-location. Đây là API lấy vị trí GPS, xin quyền vị trí, theo dõi vị trí foreground, và chuẩn bị cho foreground-service notification trên Android.

Nếu nói ngắn gọn:

- React Native và Expo dùng để xây app.
- Firebase Auth dùng để đăng nhập.
- Firestore dùng để xem dữ liệu realtime và cloud history.
- SQLite dùng để lưu dữ liệu hành trình local.
- Google Maps dùng để hiển thị bản đồ.
- Location API dùng để lấy GPS.

---

## 5. Demo - Giới thiệu từng màn hình

Phần tiếp theo em sẽ mô tả luồng demo ứng dụng.

### 5.1 Dashboard

Sau khi đăng nhập, người dùng vào Dashboard.

Đây là màn hình tổng quan. Ở đây người dùng nhìn nhanh được:

- tổng số thiết bị trong tài khoản;
- bao nhiêu thiết bị đang trực tuyến;
- bao nhiêu thiết bị mất kết nối;
- thiết bị đang được chọn;
- tốc độ hiện tại;
- tốc độ tối đa;
- trạng thái di chuyển;
- trạng thái kết nối;
- và bản đồ mini nếu có Internet.

Nếu đang offline, Dashboard không cố load Google Map để tránh crash. Thay vào đó, ứng dụng hiển thị trạng thái ngoại tuyến và vẫn giữ dữ liệu đã cache trước đó.

Ý nghĩa của Dashboard là cho người dùng một cái nhìn nhanh: hiện tại hệ thống đang có những thiết bị nào và trạng thái tổng quan ra sao.

### 5.2 Fleet Map

Tiếp theo là Fleet Map, tức bản đồ tất cả thiết bị.

Màn hình này hiển thị nhiều thiết bị trên cùng một bản đồ. Mỗi thiết bị có marker riêng. Người dùng có thể chọn một marker để xem thông tin chi tiết hơn.

Panel thông tin thiết bị hiển thị:

- tên thiết bị;
- thiết bị này hay thiết bị từ xa;
- trạng thái kết nối: Trực tuyến hoặc Mất kết nối;
- trạng thái hoạt động: Đang di chuyển, Tạm dừng, Đỗ xe hoặc Mất GPS;
- tốc độ hiện tại;
- tốc độ tối đa;
- thời gian dừng;
- quãng đường hôm nay;
- thời gian cập nhật;
- tọa độ;
- địa chỉ nếu có.

Nếu offline, màn hình không render bản đồ. Ứng dụng hiển thị thông báo dễ hiểu rằng không thể tải bản đồ khi không có kết nối Internet, kèm nút thử lại.

### 5.3 History

Màn hình History dùng để xem lịch sử hành trình.

Điểm quan trọng là History có thể chọn thiết bị. Nếu chọn thiết bị hiện tại, dữ liệu lịch sử lấy từ SQLite trên máy. Nếu chọn thiết bị từ xa, dữ liệu lịch sử lấy từ Firestore.

Các chuyến đi được nhóm theo ngày. Với mỗi ngày, người dùng có thể xem:

- số chuyến;
- tổng quãng đường;
- tổng thời gian di chuyển;
- thời gian dừng;
- tốc độ tối đa;
- tốc độ trung bình;
- số điểm GPS.

Mỗi chuyến đi hiển thị thời gian bắt đầu, thời gian kết thúc, quãng đường, tốc độ, điểm đầu, điểm cuối và trạng thái đồng bộ.

Nếu chuyến đi local đang chờ đồng bộ, người dùng vẫn xem được đầy đủ vì dữ liệu nằm trong SQLite. Khi có Internet, người dùng có thể bấm đồng bộ hoặc hệ thống tự retry khi mạng quay lại.

### 5.4 Playback

Playback là màn hình phát lại hành trình trên bản đồ.

Ứng dụng vẽ tuyến đường bằng polyline. Có marker điểm bắt đầu, điểm kết thúc và marker đang di chuyển theo thời gian. Người dùng có thể bấm Phát, Tạm dừng, Phát lại, Về đầu, Đến cuối và chọn tốc độ phát.

Điểm kỹ thuật ở đây là playback không giả định GPS luôn cập nhật đúng mỗi giây. Ứng dụng dùng timestamp của từng điểm GPS và nội suy vị trí giữa hai điểm để marker di chuyển mượt hơn.

Playback có thể dùng dữ liệu local từ SQLite hoặc dữ liệu cloud từ Firestore gpsChunks. Với chuyến local đang chờ đồng bộ, playback vẫn mở được nếu trong SQLite có GPS points.

### 5.5 Settings

Settings là màn hình cấu hình.

Người dùng có thể:

- xem và đổi tên thiết bị;
- xem mã thiết bị;
- kiểm tra quyền vị trí;
- mở lại wizard thiết lập theo dõi;
- kiểm tra quyền thông báo;
- bật hoặc tắt auto tracking;
- đăng xuất.

Các thuật ngữ kỹ thuật như SQLite, Firestore path hay local device ID không được hiển thị trực tiếp cho người dùng phổ thông. Giao diện dùng các từ dễ hiểu như "Dữ liệu trên thiết bị này", "Đồng bộ đám mây", "Mã thiết bị".

### 5.6 Permission Wizard

Permission Wizard hướng dẫn người dùng cấp quyền cần thiết.

Trên Android, các bước gồm:

1. Vị trí khi dùng ứng dụng.
2. Vị trí luôn cho phép.
3. Tự khởi động.
4. Tối ưu pin.
5. Thông báo.
6. Hoàn tất.

Trên iOS, wizard khác đi:

1. Vị trí khi dùng ứng dụng.
2. Vị trí luôn luôn.
3. Thông báo.
4. Hướng dẫn chạy nền.
5. Hoàn tất.

Ứng dụng cũng nói rõ giới hạn: cấp quyền background không có nghĩa là background tracking đã hoàn chỉnh. Để kiểm thử đầy đủ cần Development Build hoặc APK, không nên đánh giá chỉ bằng Expo Go.

---

## 6. Tracking Demo - Kịch bản demo theo dõi

Sau đây là kịch bản demo tracking.

Đầu tiên, người dùng đăng nhập vào ứng dụng. Sau đó chọn hoặc tạo thiết bị local. Khi thiết bị đã sẵn sàng và quyền vị trí đã được cấp, Tracking Engine được khởi tạo.

Ở trạng thái ban đầu, nếu thiết bị chưa di chuyển, trạng thái có thể là Không hoạt động hoặc Đỗ xe tùy theo dữ liệu vị trí hiện tại.

Khi thiết bị bắt đầu di chuyển, GPS gửi các điểm vị trí mới. Ứng dụng tính tốc độ dựa trên khoảng cách giữa hai tọa độ liên tiếp và thời gian giữa hai timestamp. Nếu tốc độ và khoảng cách đủ ý nghĩa, hệ thống chuyển sang Đang di chuyển.

Khi bắt đầu di chuyển, nếu chưa có chuyến đi active, hệ thống tự tạo một trip mới trong SQLite.

Trong lúc di chuyển, mỗi điểm GPS hợp lệ được lưu vào bảng gps_points. Tốc độ hiện tại, tốc độ tối đa, quãng đường và live location được cập nhật. Nếu có Internet, Firestore liveLocation cũng được cập nhật để thiết bị khác có thể xem realtime.

Nếu thiết bị dừng lại, hệ thống không kết thúc chuyến ngay lập tức. Sau 30 giây dừng, trạng thái chuyển sang Tạm dừng. Điều này giúp tránh trường hợp xe dừng đèn đỏ hoặc kẹt xe ngắn mà bị tách thành nhiều chuyến.

Nếu thiết bị tiếp tục đứng yên đủ 3 phút, trạng thái chuyển sang Đỗ xe. Lúc này hệ thống hoàn thành chuyến đi. Trip được lưu với thời gian kết thúc tại thời điểm bắt đầu quá trình đỗ, để phần chờ xác nhận đỗ xe không làm dài sai thời lượng playback.

Nếu mất Internet trong lúc di chuyển, ứng dụng vẫn tiếp tục lưu GPS vào SQLite. Giao diện hiển thị Mất kết nối, nhưng tốc độ gần nhất, trạng thái di chuyển, tọa độ và dữ liệu đã có vẫn được giữ lại.

Khi Internet quay lại, ứng dụng cập nhật live location lại và retry đồng bộ những chuyến đang chờ. Người dùng không cần khởi động lại app.

Cuối cùng, người dùng mở History, chọn chuyến đi, bấm xem bản đồ hành trình. Playback sẽ phát lại tuyến đường đã ghi nhận.

---

## 7. Offline Demo - Demo mất mạng

Một điểm quan trọng của Track Device là trải nghiệm offline.

Kịch bản demo như sau.

Đầu tiên, thiết bị đang online và đang được theo dõi bình thường. Dashboard hiển thị tổng số thiết bị, thiết bị trực tuyến, thiết bị mất kết nối, mini map và thông tin thiết bị.

Sau đó, ta tắt Internet.

Ứng dụng không reset giao diện về số 0. Tốc độ gần nhất vẫn được giữ. Tọa độ gần nhất vẫn còn. Trạng thái di chuyển vẫn giữ theo dữ liệu cuối cùng. Nguồn dữ liệu chuyển thành "Dữ liệu ngoại tuyến".

Nếu mở Fleet Map khi offline, ứng dụng không cố load Google Map. Thay vào đó, hiển thị thông báo: "Bạn đang ngoại tuyến. Không thể tải bản đồ khi không có kết nối Internet." Có nút "Thử lại".

Trong lúc offline, GPS vẫn có thể tiếp tục ghi vào SQLite nếu tracking đang chạy. Đây là điểm rất quan trọng. Dữ liệu hành trình không bị mất chỉ vì không có mạng.

Khi bật Internet lại, ConnectivityContext phát hiện online. Các màn hình có thể dùng lại dữ liệu realtime. Hệ thống cũng retry các chuyến đi đang chờ đồng bộ. Nếu sync thành công, trạng thái chuyển từ "Chờ đồng bộ" sang "Đã đồng bộ".

Thông điệp chính của phần này là: Track Device không phụ thuộc hoàn toàn vào Internet. Internet giúp đồng bộ và xem realtime, nhưng dữ liệu hành trình local vẫn được bảo vệ.

---

## 8. Technical Highlights - Điểm kỹ thuật nổi bật

### 8.1 Local-first

Điểm kỹ thuật quan trọng nhất là local-first. Với ứng dụng GPS, nếu mất dữ liệu vị trí thì hệ thống mất giá trị. Vì vậy Track Device lưu GPS points vào SQLite trước, sau đó mới đồng bộ lên Firestore.

### 8.2 SQLite

SQLite lưu hai bảng chính:

- trips: thông tin chuyến đi;
- gps_points: các điểm GPS thuộc chuyến đi.

Mỗi gps_point có latitude, longitude, speedKmh, timestamp và các thông tin phụ như heading, accuracy, altitude.

SQLite là nguồn dữ liệu gốc cho playback local.

### 8.3 Tracking Engine

TrackingEngine là phần điều phối chính. Nó nhận location từ GpsEngine, kiểm tra dữ liệu hợp lệ, tính tốc độ, phát hiện di chuyển, tạm dừng, đỗ xe, tạo trip, lưu điểm GPS và cập nhật liveLocation.

GpsEngine chỉ giao tiếp với expo-location. Nó không biết SQLite hay Firebase. Cách tách này giúp code rõ ràng hơn.

### 8.4 Spike filtering

GPS đôi khi có lỗi nhảy điểm, ví dụ tốc độ 35.000 km/h hoặc 50.000 km/h trong một frame. Track Device không đơn giản là clamp tốc độ xuống một mức nào đó. Thay vào đó, hệ thống loại bỏ điểm GPS bất thường để điểm sai không ảnh hưởng đến tốc độ hiện tại, tốc độ tối đa, quãng đường và playback.

### 8.5 Cloud sync

Khi trip hoàn thành, SQLite lưu trước. Sau đó hệ thống upload trip summary lên Firestore. GPS points không được lưu tất cả vào một document lớn, mà được chia thành các gpsChunks, mỗi chunk có số điểm giới hạn. Cách này tránh vượt giới hạn kích thước document của Firestore.

### 8.6 Cache

Ứng dụng dùng AsyncStorage để lưu last-known display data. Khi mất Internet, Dashboard và Live Tracking vẫn có thể hiển thị dữ liệu gần nhất, thay vì trống hoặc crash.

### 8.7 Foreground notification

Trên Android Development Build hoặc APK, khi tracking đang chạy, ứng dụng có thể dùng foreground-service notification để hiển thị trạng thái thiết bị:

Ví dụ:

Track Device - iPhone của Hiếu  
27 km/h | Trực tuyến | Đang di chuyển

Nếu mất kết nối:

Track Device - Thiết bị của Hiếu  
Tốc độ gần nhất 27 km/h | Mất kết nối | Đỗ xe

Tuy nhiên, cần nói rõ rằng Expo Go không phải môi trường để xác nhận đầy đủ foreground-service notification và background behavior.

---

## 9. Advantages - Lợi ích thực tế

Track Device có một số lợi ích thực tế.

Thứ nhất, ứng dụng tự động theo dõi. Người dùng không cần nhớ bấm bắt đầu hoặc kết thúc chuyến đi.

Thứ hai, dữ liệu an toàn hơn khi mất mạng. GPS vẫn có thể lưu local vào SQLite.

Thứ ba, có thể quản lý nhiều thiết bị trong cùng một tài khoản.

Thứ tư, Dashboard giúp xem nhanh tổng quan, còn Fleet Map giúp xem nhiều thiết bị trên bản đồ.

Thứ năm, History được nhóm theo ngày, phù hợp cho báo cáo hành trình.

Thứ sáu, Playback giúp xem lại tuyến đường trực quan, không chỉ xem dữ liệu dạng bảng.

Thứ bảy, hệ thống sync theo hướng best-effort. Nếu upload thất bại, dữ liệu local không mất và có thể retry sau.

Thứ tám, kiến trúc tách lớp rõ ràng: GPS engine, tracking engine, repository, Firebase service, context và UI. Điều này giúp dễ mở rộng.

Thứ chín, ứng dụng có thiết kế phù hợp với người dùng phổ thông: dùng tiếng Việt, trạng thái rõ ràng, không lộ quá nhiều thuật ngữ kỹ thuật.

---

## 10. Future Development - Hướng phát triển tương lai

Trong tương lai, Track Device có thể phát triển thêm nhiều tính năng.

Đầu tiên là Geofence. Người dùng có thể tạo vùng địa lý, ví dụ bãi xe, trường học, kho hàng hoặc khu vực cho thuê. Khi thiết bị vào hoặc ra khỏi vùng này, hệ thống có thể cảnh báo.

Thứ hai là cảnh báo tốc độ. Nếu xe vượt quá tốc độ cài đặt, ứng dụng có thể gửi cảnh báo cho người quản lý.

Thứ ba là nhắc bảo trì. Với xe cho thuê hoặc xe công ty, hệ thống có thể nhắc bảo trì dựa trên quãng đường hoặc thời gian sử dụng.

Thứ tư là quản lý tài xế. Một thiết bị hoặc một xe có thể gắn với tài xế, ca làm việc, hoặc đơn giao hàng.

Thứ năm là quản lý xe cho thuê. Có thể thêm trạng thái xe đang thuê, đang rảnh, đang bảo trì, lịch sử thuê và báo cáo sử dụng.

Thứ sáu là thống kê nâng cao. Ví dụ tổng số km theo tuần, thời gian di chuyển theo tháng, thiết bị hoạt động nhiều nhất, thiết bị mất kết nối nhiều nhất.

Thứ bảy là thông báo realtime. Khi thiết bị mất kết nối, vượt tốc độ hoặc ra khỏi vùng cho phép, hệ thống có thể gửi thông báo.

Thứ tám là dashboard web cho người quản lý. Mobile app phù hợp cho người dùng cá nhân, nhưng quản lý đội xe lớn có thể cần màn hình web rộng hơn.

Cuối cùng là background tracking hoàn chỉnh hơn. Hiện tại dự án đã chuẩn bị về quyền và foreground-service notification, nhưng để đạt mức production ổn định trên Android và iOS cần tiếp tục kiểm thử bằng Development Build hoặc APK, đồng thời tuân thủ giới hạn hệ điều hành.

---

## 11. Conclusion - Kết luận

Tóm lại, Track Device là một ứng dụng theo dõi vị trí thiết bị theo hướng tự động, local-first và hỗ trợ nhiều thiết bị.

Ứng dụng giải quyết ba nhu cầu chính:

- theo dõi realtime;
- lưu và xem lại lịch sử hành trình;
- hoạt động tốt hơn trong điều kiện mất mạng.

Về mặt kỹ thuật, dự án kết hợp React Native, Expo, Firebase, Firestore, SQLite, Google Maps và Location API. Kiến trúc được tách lớp rõ ràng để dễ bảo trì và mở rộng.

Về mặt ứng dụng thực tế, Track Device có thể dùng cho quản lý xe cho thuê, quản lý đội xe nhỏ, theo dõi thiết bị, giao hàng, hoặc các tình huống cần ghi nhận hành trình.

Em xin cảm ơn quý thầy cô và các bạn đã lắng nghe. Sau đây em xin sẵn sàng trả lời câu hỏi.

---

# Frequently Asked Questions - Câu hỏi thường gặp

## 1. Vì sao dự án tên là Track Device mà không phải Track Vehicle?

Vì ứng dụng không chỉ giới hạn cho xe. Nó có thể theo dõi điện thoại, thiết bị di động, xe máy, ô tô, thiết bị giao hàng hoặc các thiết bị khác. Tên Track Device rộng hơn và phù hợp hơn với hướng phát triển đa thiết bị.

## 2. Ứng dụng này khác gì Google Maps chia sẻ vị trí?

Google Maps chia sẻ vị trí chủ yếu để xem vị trí hiện tại. Track Device tập trung vào quản lý thiết bị, tự động tạo chuyến đi, lưu GPS points vào SQLite, xem lịch sử theo ngày, phát lại hành trình và đồng bộ cloud history.

## 3. Vì sao không dùng Firebase hoàn toàn mà còn dùng SQLite?

Vì GPS tracking cần hoạt động khi mất mạng. Nếu chỉ dùng Firebase, mất Internet có thể làm mất dữ liệu hoặc không ghi được hành trình. SQLite giúp lưu dữ liệu local trước, sau đó sync lên Firebase khi có mạng.

## 4. SQLite lưu những dữ liệu gì?

SQLite lưu trips và gps_points. Trips là thông tin chuyến đi như thời gian bắt đầu, kết thúc, quãng đường, tốc độ. Gps_points là các tọa độ GPS chi tiết dùng cho playback.

## 5. Firestore dùng để làm gì?

Firestore lưu user profile, danh sách thiết bị, liveLocation hiện tại, trip summaries và GPS chunks đã đồng bộ. Firestore giúp các thiết bị khác xem realtime và xem lịch sử từ xa.

## 6. Nếu mất mạng khi đang chạy thì có mất hành trình không?

Không. Nếu GPS vẫn hoạt động, ứng dụng vẫn lưu dữ liệu vào SQLite. Khi mạng quay lại, hệ thống sẽ đồng bộ các chuyến đang chờ.

## 7. Nếu mất mạng thì Fleet Map có chạy không?

Khi offline, app không render Google Map để tránh lỗi. Thay vào đó, app hiển thị trạng thái ngoại tuyến và dữ liệu cache gần nhất nếu có.

## 8. Ứng dụng có theo dõi nền 24/7 chưa?

Chưa thể khẳng định 24/7 ở MVP 1. Dự án có chuẩn bị foreground-service notification cho Android và permission setup, nhưng background tracking ổn định cần kiểm thử trên Development Build hoặc APK và còn phụ thuộc giới hạn hệ điều hành.

## 9. Expo Go có test được đầy đủ tracking nền không?

Không. Expo Go phù hợp để phát triển giao diện và một số API, nhưng không phải môi trường xác nhận đầy đủ foreground service hoặc background location. Cần Development Build hoặc EAS APK.

## 10. Tại sao cần foreground notification trên Android?

Android yêu cầu foreground service có notification khi ứng dụng theo dõi vị trí trong bối cảnh cần tiếp tục hoạt động. Notification cũng giúp người dùng biết app đang theo dõi vị trí.

## 11. Notification có hiển thị thiết bị từ xa không?

Không. Notification chỉ hiển thị thiết bị local đang chạy app. Nó không dùng selected remote device và không hiển thị raw deviceId.

## 12. Tốc độ được tính như thế nào?

Tốc độ được tính từ khoảng cách giữa hai tọa độ GPS liên tiếp và thời gian giữa hai timestamp. Công thức là quãng đường chia thời gian, đổi sang km/h. App không chỉ dựa vào `location.coords.speed`.

## 13. Nếu GPS bị nhảy điểm thì sao?

Ứng dụng có cơ chế lọc spike. Những điểm có tọa độ sai, timestamp không hợp lệ, khoảng thời gian quá ngắn, accuracy kém hoặc nhảy quá xa sẽ bị loại khỏi dữ liệu chính.

## 14. Ứng dụng có giới hạn tốc độ tối đa không?

Không clamp tốc độ bằng một con số cố định. Nếu dữ liệu GPS hợp lệ và chuyển động tốc độ cao kéo dài nhất quán thì có thể được chấp nhận. Điểm bất thường một frame sẽ bị loại.

## 15. Trip được tạo khi nào?

Trip được tạo tự động khi hệ thống phát hiện thiết bị bắt đầu di chuyển có ý nghĩa.

## 16. Trip kết thúc khi nào?

Khi thiết bị dừng đủ lâu, cụ thể sau khoảng thời gian Parking được cấu hình. Ở MVP hiện tại, Paused sau 30 giây và Parking sau 3 phút.

## 17. Vì sao có trạng thái Tạm dừng?

Tạm dừng giúp tránh cắt chuyến đi quá sớm khi xe dừng đèn đỏ, kẹt xe hoặc dừng ngắn. Trip vẫn active trong trạng thái Tạm dừng.

## 18. Vì sao playback không bao gồm thời gian chờ xác nhận đỗ xe?

Vì đoạn chờ xác nhận Parking không phải phần di chuyển thực sự. Trip endTime được trim để playback phản ánh hành trình di chuyển, không kéo dài sai do xe đứng yên.

## 19. Cloud history có lưu từng điểm GPS thành từng document không?

Không. Ứng dụng không tạo một document cho mỗi GPS point vì cách đó tốn tài nguyên và khó mở rộng. GPS points được chia thành chunks, mỗi chunk chứa nhiều điểm.

## 20. Vì sao phải chia GPS chunks?

Firestore có giới hạn kích thước document. Chia chunks giúp tránh document quá lớn, đồng thời vẫn tải dữ liệu playback theo từng chuyến khi cần.

## 21. History local và remote khác nhau thế nào?

Nếu xem thiết bị local, History lấy từ SQLite. Nếu xem thiết bị từ xa, History lấy từ Firestore trip summaries. Hai nguồn không bị trộn lẫn.

## 22. Một thiết bị có thể sửa lịch sử của thiết bị khác không?

Theo kiến trúc ứng dụng, thiết bị local chỉ upload lịch sử của chính nó. Remote history là read-only. Tuy nhiên, bảo mật tuyệt đối ở phía client vẫn cần Firestore rules, App Check hoặc backend nếu triển khai production nghiêm ngặt.

## 23. Firebase có bảo mật không?

Firebase có Authentication và Firestore Security Rules. Trong MVP, app dùng uid để lưu dữ liệu dưới `users/{uid}`. Với production, cần viết rules chặt chẽ và cân nhắc App Check hoặc backend để tăng độ tin cậy.

## 24. Ứng dụng có scale được nhiều thiết bị không?

Kiến trúc đã hỗ trợ nhiều thiết bị trong một tài khoản. Tuy nhiên, nếu số lượng thiết bị rất lớn, cần tối ưu thêm pagination, batch loading, index Firestore và có thể cần backend aggregation.

## 25. Tại sao không dùng một backend riêng?

MVP ưu tiên tốc độ phát triển và đơn giản. Firebase cung cấp Auth và Firestore đủ tốt cho prototype/MVP. Backend riêng có thể được thêm ở các giai đoạn sau nếu cần logic bảo mật hoặc xử lý dữ liệu lớn.

## 26. Google Maps có hoạt động offline không?

Không theo nghĩa đầy đủ. Khi offline, app không cố render Google Map. Tuy nhiên, dữ liệu tracking local vẫn được lưu và UI có thể hiển thị cache.

## 27. Ứng dụng có dùng AI không?

Không. MVP 1 không có AI, không phân tích hành vi tài xế, không camera và không video.

## 28. Có thể dùng app để quản lý xe cho thuê không?

Có thể là một use case phù hợp. Track Device có thể theo dõi vị trí xe, xem lịch sử hành trình và quản lý nhiều thiết bị. Tuy nhiên, các tính năng chuyên sâu như hợp đồng thuê, thanh toán hoặc cảnh báo geofence là phần tương lai.

## 29. Nếu người dùng xóa app thì dữ liệu SQLite có mất không?

Thông thường, dữ liệu local của app sẽ mất khi gỡ ứng dụng. Nhưng các chuyến đã đồng bộ lên Firestore vẫn có thể xem lại từ thiết bị khác sau khi đăng nhập.

## 30. Vì sao không upload active trip liên tục lên cloud history?

Vì active trip chưa hoàn thành và có thể thay đổi. MVP chỉ upload completed trip để đảm bảo cloud history là read model ổn định. Live location realtime được lưu riêng ở liveLocation/current.

## 31. Ứng dụng có thể phát lại chuyến từ thiết bị khác không?

Có, nếu chuyến đã được đồng bộ lên Firestore cùng gpsChunks. Playback cloud sẽ tải summary và chunks, sau đó phát lại trên cùng màn hình Playback.

## 32. Nếu sync thất bại thì người dùng biết không?

Có. Local history có thể hiển thị trạng thái như Chờ đồng bộ hoặc Đồng bộ thất bại. Người dùng có thể thử đồng bộ lại khi có Internet.

## 33. Có rủi ro gì khi dùng GPS trên điện thoại?

Có. GPS có thể sai do môi trường, nhà cao tầng, hầm, thiết bị yếu, hoặc quyền bị tắt. Vì vậy app có kiểm tra GPS health, accuracy và lọc điểm bất thường.

## 34. Tại sao cần Permission Wizard?

Vì theo dõi vị trí cần nhiều quyền và nhiều thiết lập hệ thống, đặc biệt trên Android. Wizard giúp người dùng hiểu từng bước và tránh bỏ sót quyền quan trọng.

## 35. Auto Start có bật tự động được không?

Không có API chung cho tất cả hãng Android để bật Auto Start. Ứng dụng chỉ có thể hướng dẫn hoặc mở cài đặt phù hợp khi có thể. Người dùng vẫn phải xác nhận thủ công.

## 36. Battery Optimization có tắt tự động được không?

Không nên và thường không thể tắt tự động. App chỉ hướng dẫn người dùng mở cài đặt. Việc tắt hay không phụ thuộc thiết bị và hệ điều hành.

## 37. Vì sao app dùng tiếng Việt cho trạng thái?

Vì đối tượng người dùng chính là người Việt. Các trạng thái như Trực tuyến, Mất kết nối, Đang di chuyển, Tạm dừng, Đỗ xe dễ hiểu hơn so với thuật ngữ kỹ thuật.

## 38. Có thể thêm web dashboard không?

Có. Vì dữ liệu thiết bị, live location và cloud history đã có trên Firestore, một web dashboard có thể được phát triển trong MVP 2 hoặc giai đoạn sau.

## 39. Có thể thêm cảnh báo vượt tốc độ không?

Có. App đã tính tốc độ hiện tại và tốc độ tối đa. Tương lai có thể thêm ngưỡng tốc độ và gửi cảnh báo khi vượt ngưỡng.

## 40. Hạn chế lớn nhất hiện tại là gì?

Hạn chế lớn nhất là background tracking và foreground-service behavior cần runtime acceptance trên Android Development Build hoặc APK thật. Ngoài ra, production security cũng cần Firestore rules chặt chẽ hơn và có thể cần backend/App Check.

---

## Ghi chú cho người thuyết trình

- Nói chậm ở phần vấn đề để người nghe hiểu bối cảnh.
- Khi demo, nên dùng một tài khoản có ít nhất hai thiết bị để Fleet Map rõ hơn.
- Nên chuẩn bị sẵn một chuyến đi đã có dữ liệu để demo History và Playback.
- Nếu demo offline, nên nói trước rằng bản đồ online không tải khi mất mạng, nhưng dữ liệu tracking local vẫn được lưu.
- Không khẳng định background tracking đã hoàn chỉnh 24/7 nếu chưa test bằng Development Build hoặc APK thật.
