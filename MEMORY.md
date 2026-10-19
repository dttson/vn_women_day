# SmallGif — Project memory

## Mốc đã chốt — 2026-10-19

Đã thống nhất phần ý tưởng. Bước tiếp theo là bàn architecture; chưa chốt kiến trúc, công nghệ lưu trữ hay triển khai.

## Mục đích và giọng kể

- Ứng dụng 3D chạy trên web, sử dụng Three.js, làm quà 20/10 cho vợ và tiếp tục dùng những ngày sau.
- Hai vợ chồng đã có hai con. Luôn xưng hô **ba – mẹ** trong nội dung dành cho người dùng: ba là người gửi quà, mẹ là người nhận. Không dùng anh – em.
- Tên concept: **Một bông hoa dành cho mẹ**.
- Tinh thần: mỗi lần mẹ chăm hoa, mẹ nhận thêm một chút yêu thương từ ba; ấm áp, lãng mạn, gắn với gia đình nhưng vẫn có tình cảm riêng của hai vợ chồng.

## Trải nghiệm chính

- Một bông hoa 3D lớn nằm giữa màn hình, ban đầu là nụ chưa nở. Ưu tiên điện thoại dọc; hoa chiếm khoảng 60–70% chiều cao vùng nhìn chính.
- Nhấn giữ để tưới liên tục; bình nghiêng, nước chảy xuống gốc, nước trong bình giảm và đất ẩm lên.
- Lượng nước mỗi lượt có hạn. Khi đất đủ ẩm, dừng tưới và chờ nước ngấm trước lượt tiếp theo; khuyến khích quay lại app.
- Phân biệt lượng nước trong bình với độ ẩm của đất. Tưới mới tăng tiến độ; chờ chỉ giúp đất sẵn sàng nhận nước. Thả tay giữ lại phần nước chưa dùng.
- Lần tưới đầu phải có thay đổi nhìn thấy ngay: thân vươn, lá mở, cây tươi hơn.
- Đề xuất nhịp ban đầu: mỗi lượt 6–8 giây; chờ khoảng 30 phút; sau 3 lượt hoa nở trọn trong ngày. Đây là thông số cần thử nghiệm, chưa phải ràng buộc cố định.
- Hoa hé dần qua từng lượt, đồng thời mở lời nhắn. Khi nở trọn: camera tiến nhẹ, cánh hoa mở chậm, hiệu ứng ánh sáng tinh tế, mở lời chúc 20/10 và thư riêng.

## Sau ngày 20/10

- Giữ bông hoa đã nở, chăm tiếp để thêm lá, nụ, lời nhắn và các mùa hoa.
- Nhịp lâu dài đề xuất: một lượt có ích mỗi ngày, khoảng 5–7 lượt cho một chu kỳ mới; cần thử nghiệm.
- Hộp kỷ niệm giữ lời nhắn đã mở và ngày hoa nở. Có thể thêm lời chúc sinh nhật, ngày cưới.
- Không để hoa chết, mất tiến độ hay phạt vì bỏ ngày. Khi quay lại, chào đón nhẹ nhàng.

## Nội dung mẫu đã thống nhất

- Mở đầu: “Ba có một bông hoa dành cho mẹ. Nhưng bông hoa này cần mẹ chăm một chút mới chịu nở.”
- Sau lượt đầu: “Cảm ơn mẹ vì những điều nhỏ bé mẹ làm cho cả nhà mỗi ngày.”
- Hoa hé: “Có mẹ, những ngày bình thường của ba và hai con cũng trở nên đặc biệt.”
- Đủ nước: “Đủ nước rồi mẹ ơi. Để hoa uống từ từ nhé.”
- Hoa nở: “Chúc mừng 20/10, mẹ yêu. Bông hoa này ba dành tặng mẹ. Cảm ơn mẹ vì đã cùng ba chăm sóc tổ ấm và hai bạn nhỏ của mình.”
- Nút mở thư: “Ba có đôi lời gửi mẹ 💌”
- Quay lại: “Mẹ về rồi à? Bông hoa của ba vẫn ở đây chờ mẹ.”
- Thư cuối cần nội dung cá nhân của ba: kỷ niệm, lời cảm ơn và tình cảm dành riêng cho mẹ; chưa có bản thư cuối cùng.

## Hướng hình ảnh

- 3D mềm mại, lãng mạn, hơi cổ tích. Nền kem hồng, lá xanh dịu, cánh hồng đào.
- Hoa cách điệu nhiều lớp cánh; chậu nhỏ bên dưới, bình tưới bên cạnh khi tương tác.
- UI gọn: lời nhắn phía trên; nút tưới, lượng nước và trạng thái đất phía dưới, không che hoa.
- Chuyển động đung đưa, ánh nắng và hạt sáng nhẹ. Âm thanh có nút bật riêng.

## Phạm vi bản đầu và việc cần bàn

- Hoa nở liên tục theo tiến độ; bình tưới, dòng nước, đất đổi màu; ba lượt đầu mở lời chúc; lưu tiến độ, thư và lời nhắn; tính thời gian ngấm khi đóng app; UI tiếng Việt trên điện thoại.
- Three.js là yêu cầu của người dùng. TypeScript + Vite mới là đề xuất, chưa chốt architecture.
- Cần bàn cấu trúc scene/animation, state và thời gian, lưu dữ liệu, link riêng, trải nghiệm đa thiết bị, hosting và cách cập nhật nội dung.
- Lưu trên trình duyệt hoặc máy chủ đều mới là phương án; chưa chọn backend, framework, database hay dịch vụ deploy.
- Chưa triển khai code hoặc deploy.

## Quy tắc project

- Không chạy `dotnet build` để kiểm tra lỗi compile (yêu cầu trực tiếp của người dùng).
