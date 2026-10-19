# Deploy ứng dụng lên Vercel

Repo: https://github.com/dttson/vn_women_day — nhánh production: `main`.

## Tạo dự án

1. Mở https://vercel.com/new và đăng nhập tài khoản Vercel của bạn.
2. Trong **Import Git Repository**, kết nối GitHub và chọn repo **dttson/vn_women_day**, rồi **Import**. Nếu chưa thấy repo, cấp quyền cho Vercel truy cập repo này trong phần kết nối GitHub.
3. Đặt tên dự án, ví dụ `vn-women-day`, và chọn cấu hình bên dưới. `vercel.json` trong repo đã khai báo các lệnh build; giữ các giá trị đó.
4. Nhấn **Deploy** và chờ deployment chuyển sang **Ready**.

| Mục | Giá trị |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | Gốc repo (`./`) |
| Install Command | `npm ci` |
| Build Command | `npm test && npm run build` |
| Output Directory | `dist` |
| Node.js | 22.x (đã khai báo trong `package.json`) |
| Environment Variables | Không cần |

Không cần database, API key hay backend cho phiên bản này. Nếu tên dự án đã được dùng, chọn tên khác; URL cuối cùng lấy từ Vercel sau khi deploy thành công.

## Kiểm tra sau deploy

- Mở URL production qua HTTPS trên iPhone. Kiểm tra bông hoa, nút tưới và Cài đặt.
- Vào **Cài đặt → Chọn ảnh gia đình** để chọn ảnh riêng cho mẹ, Bisu, Ryo và album kỷ niệm. JPEG, PNG và HEIC được xử lý ngay trên thiết bị, không upload lên Vercel.
- Giữ URL production ổn định để dùng hằng ngày. Tiến độ và ảnh trên localhost không tự chuyển sang Vercel; có thể xuất/nhập bản sao tiến độ, còn ảnh cần chọn lại trên thiết bị nhận quà.
- Bản xem thử `/?demo=1` có tiến độ và ảnh tạm, mất khi tải lại trang. Khi đủ 18 lượt chăm theo cấu hình mặc định, hộp ảnh kỷ niệm mới mở.
- Có thể thêm website vào màn hình chính từ Safari. Nên chọn ảnh trong đúng trình duyệt hoặc ứng dụng màn hình chính sẽ dùng hằng ngày.

## Cập nhật những lần sau

Sau khi repo được kết nối với dự án Vercel, dùng `main` làm **Production Branch**. Các lần push tiếp theo lên `main` sẽ được Vercel build và deploy tự động nếu tính năng Git deployment được bật.

Ảnh gia đình và ảnh chụp màn hình riêng tư không nằm trong repo. Các bản ảnh cũ trên máy phát triển được giữ trong thư mục `private-local/`, đã bị loại khỏi Git/Vercel và nằm ngoài thư mục public của ứng dụng.

## Nếu build thất bại

Mở log deployment để xem lỗi cụ thể. Kiểm tra Root Directory là gốc repo, Node.js 22.x, Output Directory `dist`, và các lệnh khớp bảng trên. Không đặt `NODE_ENV=production` cho bước cài dependencies vì bước build cần TypeScript/Vite trong devDependencies.

Thông báo bundle lớn là cảnh báo kích thước, không phải lỗi build. Bộ giải mã HEIC được tách thành một file riêng và chỉ tải khi trình duyệt cần đọc HEIC.

Tài liệu Vercel: https://vercel.com/docs/git và https://vercel.com/docs/builds/configure-a-build.
