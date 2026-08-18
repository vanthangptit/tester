# SASUCO — Hệ thống quản lý trung tâm đào tạo

Ứng dụng quản lý trung tâm kỹ năng SASUCO: hồ sơ **giảng viên**, **học viên**,
**phòng học**, cùng nền tảng dữ liệu cho **khóa học / lịch dạy** và **đăng ký học**.

Xây dựng bằng **React 18 + TypeScript (strict) + Vite + Tailwind CSS v4 + Radix UI**.
Dữ liệu hiện dùng **mock in-memory** (không cần backend, không cần cơ sở dữ liệu).

---

## 1. Yêu cầu hệ thống

| Công cụ | Phiên bản đề nghị |
| --- | --- |
| **Node.js** | `>= 20.19` (hoặc `>= 22.12`) — bắt buộc cho Vite 8 |
| **npm** | `>= 10` (đi kèm Node) |

Kiểm tra phiên bản đang cài:

```bash
node -v
npm -v
```

---

## 2. Cài đặt

Tải mã nguồn và cài đặt phụ thuộc:

```bash
git clone git@github.com:vanthangptit/tester.git
cd tester
npm install
```

---

## 3. Chạy ở chế độ phát triển (development)

```bash
npm run dev
```

Vite sẽ khởi động dev server kèm **HMR** (tự cập nhật khi sửa mã).
Mặc định ứng dụng chạy tại:

```
http://localhost:5173
```

> Nếu cổng 5173 đang bận, Vite tự chuyển sang cổng trống kế tiếp (5174, 5175…).
> Địa chỉ thực tế được in ra trong terminal.

---

## 4. Các lệnh khác

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev` | Chạy dev server (HMR) |
| `npm run build` | Kiểm tra kiểu (`tsc -b`) và build production vào thư mục `dist/` |
| `npm run preview` | Xem thử bản build production vừa tạo |
| `npm run lint` | Kiểm tra mã bằng Oxlint |

Quy trình kiểm tra trước khi commit:

```bash
npm run lint
npm run build
```

---

## 5. Hướng dẫn sử dụng

Trang hiện có: **Hồ sơ nhân sự & phòng học**, gồm 3 tab: **Giảng viên**,
**Học viên**, **Phòng học**. Với mỗi tab, tài khoản quản trị có thể:

- **Tìm kiếm** theo tên, mã, email, số điện thoại (ô tìm kiếm có debounce).
- **Lọc theo trạng thái** (đang hoạt động / ngừng hoạt động).
- **Phân trang** — mỗi trang 10 bản ghi (danh sách có thể tới hàng trăm dòng).
- **Thêm mới** bằng nút *"Thêm giảng viên / học viên / phòng học"*.
- **Sửa hồ sơ** qua menu hành động (nút `⋯`) ở cuối mỗi dòng.
- **Ngừng hoạt động / kích hoạt lại** (giảng viên nghỉ phép, học viên bảo lưu,
  phòng sửa chữa) — hồ sơ ngừng hoạt động sẽ không được xếp vào hoạt động mới.
- **Xóa hồ sơ** — nếu hồ sơ đang gắn với hoạt động **chưa kết thúc**, hệ thống sẽ
  **chặn xóa** và hiển thị lý do cụ thể.

### Quy tắc nghiệp vụ đã áp dụng
- Không cho phép xóa hồ sơ đang gắn hoạt động chưa kết thúc (báo lý do rõ ràng).
- Hồ sơ ngừng hoạt động không được gán vào hoạt động mới.
- Mã (giảng viên / học viên / phòng) là **duy nhất**.
- (Nền tảng dữ liệu) không xếp trùng giờ cho một giảng viên hoặc một phòng;
  khóa học chỉ khai giảng khi có tối thiểu **8** học viên đã xác nhận;
  giới hạn số buổi/tuần của mỗi giảng viên.

### Dữ liệu mẫu (mock)
Khi khởi động, hệ thống nạp sẵn: **8 giảng viên** (1 người nghỉ phép),
**6 phòng học** (1 phòng đang sửa), **220 học viên**, cùng các khóa học / buổi học /
đăng ký ở nhiều trạng thái.

> Dữ liệu chỉ nằm trong bộ nhớ trình duyệt. **Tải lại trang (F5) sẽ khôi phục
> dữ liệu mẫu ban đầu** — mọi thay đổi thêm/sửa/xóa sẽ mất.

---

## 6. Cấu trúc thư mục

```
src/
  lib/              Tiện ích thuần & hook dùng chung (không phụ thuộc feature)
  ui/               Component tái sử dụng (Button, Input, DataTable, Dialog…)
  mock/             Backend giả lập trong bộ nhớ (seed + độ trễ mô phỏng)
  features/
    personnel/      Giảng viên · Học viên · Phòng học
      domain/         Kiểu dữ liệu, nhãn, quy tắc nghiệp vụ (thuần, không I/O)
      api/            Truy xuất dữ liệu (đọc/ghi mock, bất đồng bộ)
      components/     Giao diện React
    courses/        Khóa học & lịch dạy (hiện có domain + tầng dữ liệu)
    enrollments/    Đăng ký học (hiện có domain + tầng dữ liệu)
```

Nguyên tắc: `features → ui/lib` (một chiều); `ui` không import từ `features`;
`domain/` là mã thuần (không React, không I/O) để dễ kiểm thử.

---

## 7. Ghi chú

- Toàn bộ dự án bật **TypeScript strict**, không dùng `any`.
- Giao diện hỗ trợ **chế độ tối** theo thiết lập hệ thống của trình duyệt.
- Tính năng **Khóa học/Lịch dạy** và **Đăng ký học** đã có sẵn tầng dữ liệu
  (domain + api) và sẽ được bổ sung giao diện ở các giai đoạn tiếp theo.
