# Kế hoạch: Giai đoạn 1.1 (sửa lỗi sổ thu chi) và Giai đoạn 3 (Tài chính giải đấu)

- **Ngày:** 2026-11-21
- **Ứng dụng:** `nocofin`, production tại https://nocofin.dsc.edu.vn
- **Người dùng chính:** Thầy Tường (Giám đốc)
- **Quyết định của người dùng (21/11):**
  - Làm tiếp **Tài chính giải đấu** (Giai đoạn 3) trước Học viên & công nợ.
  - Học phí thu **theo buổi** → ghi nhận cho thiết kế Giai đoạn 2 sau này.
  - **Chưa cần** đính kèm ảnh chứng từ vào phiếu.

---

## Giai đoạn 1.1 — Sửa lỗi sổ thu chi đang chạy (làm trước, bắt buộc)

Phát hiện sau khi lên production: giao diện và API dùng **tên trường khác nhau**:

| Giao diện đọc                   | API/database thật | Hậu quả                                                                                                                                                  |
| ------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isActive`                      | `active`          | Mọi tài khoản, cơ sở hiện "Ngừng sử dụng"; form lập phiếu lọc theo `isActive` nên **không chọn được khoản mục, tài khoản, cơ sở** → không lập được phiếu |
| `sortOrder`                     | `sort`            | Thứ tự khoản mục sai                                                                                                                                     |
| `transactionDate`               | `date`            | Ngày phiếu không hiện / gửi sai                                                                                                                          |
| `referenceNo`, `note` của phiếu | không tồn tại     | Trường hiển thị rỗng                                                                                                                                     |

Nguyên nhân bị lọt: test giao diện dùng dữ liệu giả theo đúng cấu trúc (sai) của giao diện.

Việc làm:

- [x] Rà toàn bộ dữ liệu gửi/nhận giữa giao diện và API tài chính; sửa giao diện theo API. Ngoài bảng trên còn: bộ lọc tháng gửi `month` thay vì `period` (luôn hiện tháng hiện tại), báo cáo cơ sở/khoản mục đọc sai tên số liệu, ngày bị lệch múi giờ.
- [x] Server: trả cùng kiểu dữ liệu trên SQLite và Postgres; phiếu tham chiếu khoản mục/tài khoản/cơ sở không hợp lệ trả 400 thay vì 500; cấp số phiếu và lưu phiếu trong cùng một giao dịch.
- [x] Sửa test giao diện dùng đúng cấu trúc API thật; thêm test server kiểm tra tên trường trả về.
- [x] Chạy thử end-to-end trên bản build: đăng nhập → lập phiếu thu → số dư tài khoản tăng.
- [x] Chống gửi trùng phiếu (bấm 2 lần): mọi API ghi của tài chính (POST/PATCH/PUT) nhận `Idempotency-Key` và chạy qua biên nhận chuẩn (`executeIdempotentMutation`), biên nhận và dữ liệu ghi chung một giao dịch; gửi lại cùng khoá trả lại kết quả cũ, không tạo phiếu thứ hai. Form phiếu dùng một `useSubmission` cho mọi cách bấm lưu.
- [ ] Còn lại: một số chữ tiếng Việt còn viết cứng trong các trang cũ (Tổng quan, Tài khoản, Cơ sở, phần danh sách của Sổ thu chi); form lập phiếu đã chuyển hết sang file ngôn ngữ.

---

## Giai đoạn 3 — Tài chính giải đấu

### Mục tiêu

1. Mỗi giải cờ là một "dự án" tài chính riêng: biết ngay **giải này thu bao nhiêu, chi bao nhiêu, lãi hay lỗ**.
2. Lập **dự toán** thu/chi trước giải theo khoản mục, so sánh với **thực tế** trong và sau giải.
3. Phiếu thu/chi liên quan giải vẫn nằm chung trong Sổ thu chi (số dư quỹ luôn đúng), chỉ thêm nhãn "thuộc giải nào".
4. Không làm phát sinh thêm thao tác cho phiếu thường: trường "Giải đấu" là tuỳ chọn.

### Ngoài phạm vi (để sau, hỏi lại khi cần)

- Danh sách kỳ thủ đăng ký và theo dõi từng người đã nộp lệ phí chưa.
- Hợp đồng tài trợ, công nợ nhà tài trợ.
- Bốc thăm, xếp cặp, kết quả thi đấu (không phải tài chính).

### Dữ liệu (migration mới `202611210001_create_tournaments`)

- **`finTournaments`** — giải đấu
  - `id`, `code` (duy nhất, tự sinh `GD-2026-01`), `name`, `startDate`, `endDate` (tuỳ chọn)
  - `branchId` (tuỳ chọn — cơ sở đăng cai), `venue` (địa điểm)
  - `status`: `planning` (đang chuẩn bị) / `ongoing` (đang diễn ra) / `closed` (đã quyết toán)
  - `note`, `createdAt`, `updatedAt`
- **`finTournamentBudgets`** — dự toán theo khoản mục
  - `id`, `tournamentId` → giải, `categoryId` → khoản mục, `amount` (VND); duy nhất theo (giải, khoản mục)
- **`finTransactions`** thêm cột `tournamentId` (tuỳ chọn) → giải + index.

Khoản mục mới (seed `202611210001_seed_tournament_categories`, chỉ tạo khi chưa có):

- Chi: `CHI-GIAI-THUONG` Giải thưởng, cúp, huy chương · `CHI-TRONG-TAI` Thù lao trọng tài & ban tổ chức · `CHI-DIA-DIEM-GIAI` Thuê địa điểm & thiết bị giải · `CHI-TRUYEN-THONG-GIAI` In ấn & truyền thông giải.
- Thu dùng lại: `THU-LE-PHI-GIAI` (lệ phí), `THU-TAI-TRO` (tài trợ).

### Quyền

- `finance.tournaments:view` — xem danh sách, báo cáo giải: Giám đốc, Kế toán, Thủ quỹ.
- `finance.tournaments:manage` — tạo/sửa giải, dự toán, chốt quyết toán: Giám đốc, Kế toán.
- Lập phiếu gắn giải vẫn theo quyền lập phiếu hiện có.
- Giải **đã quyết toán** không nhận phiếu mới và không đổi dự toán (mở lại được bởi người có quyền manage).

### API (`/api/finance/tournaments`)

| Method | Đường dẫn                              | Mô tả                                                                   |
| ------ | -------------------------------------- | ----------------------------------------------------------------------- |
| GET    | `/api/finance/tournaments`             | Danh sách giải + tổng thu, tổng chi, lãi/lỗ từng giải                   |
| POST   | `/api/finance/tournaments`             | Tạo giải (tự sinh mã)                                                   |
| GET    | `/api/finance/tournaments/:id`         | Chi tiết: thông tin, dự toán vs thực tế theo khoản mục, danh sách phiếu |
| PATCH  | `/api/finance/tournaments/:id`         | Sửa thông tin, đổi trạng thái                                           |
| PUT    | `/api/finance/tournaments/:id/budgets` | Lưu toàn bộ dự toán                                                     |

- Phiếu thu/chi: tạo/sửa nhận thêm `tournamentId`; danh sách lọc được theo `tournamentId`.

### Giao diện

1. **Menu Tài chính → Giải đấu** (`/finance/tournaments`): thẻ từng giải (tên, ngày, trạng thái, Thu / Chi / Lãi-lỗ), lọc theo trạng thái, nút "Thêm giải".
2. **Chi tiết giải** (`/finance/tournaments/:id`):
   - 4 chỉ số: Tổng thu, Tổng chi, Lãi/lỗ, % chi so với dự toán.
   - Bảng **Dự toán vs Thực tế** theo khoản mục (chênh lệch tô màu khi vượt).
   - Danh sách phiếu của giải; nút **Lập phiếu thu / Lập phiếu chi cho giải** (form điền sẵn giải và cơ sở đăng cai).
   - Nút sửa dự toán, đổi trạng thái / chốt quyết toán.
3. **Form lập phiếu** trong Sổ thu chi: thêm ô tuỳ chọn "Giải đấu" (chỉ giải chưa quyết toán).
4. Tiếng Việt / Anh / Trung đầy đủ; dùng tốt trên điện thoại.

### Các bước

- [x] Migration + seed khoản mục + seed quyền; test migration up/down.
- [x] Service + API + kiểm tra quyền; test API (đăng nhập, chưa đăng nhập, không đủ quyền, giải đã chốt).
- [x] Trang danh sách, trang chi tiết, ô Giải đấu trong form phiếu; test trang.
- [x] Kiểm tra bằng `check-local.sh` (skill `nocobase3-dokploy-deploy`) + chạy thử end-to-end.
- [ ] Hỏi Thầy Tường trước khi push; Thầy bấm Deploy.

---

## Các giai đoạn sau (ghi nhận)

- **Giai đoạn 2 — Học viên & công nợ học phí:** học phí tính **theo buổi** → cần ghi buổi học/điểm danh để tính tiền; chi tiết thiết kế sẽ trao đổi khi bắt đầu.
- **Giai đoạn 4 — Thù lao HLV & báo cáo nâng cao.**
- **Hoàn thiện sổ thu chi:** chuyển tiền giữa các quỹ (nộp tiền mặt vào ngân hàng), xuất Excel, khoá sổ tháng. Đính kèm chứng từ: chưa cần.

## Nhật ký

- **2026-11-21:** Lên production. Phát hiện lỗi lệch tên trường (Giai đoạn 1.1). Chốt làm Giai đoạn 3 tiếp theo.
- **2026-11-21 (tiếp):** Làm xong Giai đoạn 3 trên máy, chưa push.
  - Dữ liệu: migration `202611210001_create_tournaments` (bảng `finTournaments`, `finTournamentBudgets`, cột `finTransactions.tournamentId`); seed `202611210001_seed_tournament_categories` (4 khoản chi giải) và `202611210002_seed_tournament_roles` — **bổ sung** quyền giải đấu vào 3 vai trò tài chính đã có (production đã có vai trò nên seed cũ không chạy lại), không cấp cho `authenticated:*` hay `member`.
  - API đúng bảng trên. `GET /api/finance/options` trả thêm `tournaments` (các giải chưa quyết toán) để form phiếu chọn giải chỉ cần quyền lập phiếu. Danh sách phiếu trả thêm `tournamentCode`, `tournamentName`.
  - Giải đã quyết toán: từ chối phiếu mới gắn giải (400, trường `tournamentId`), từ chối **sửa và xoá** phiếu đang thuộc giải, khoá dự toán và thông tin giải; chỉ đổi được trạng thái (mở lại) bởi người có quyền quản lý giải. Việc chặn xoá phiếu là bổ sung so với kế hoạch, cho số quyết toán không đổi.
  - Mã giải `GD-YYYY-NN` lấy theo năm của ngày bắt đầu, cấp trong cùng giao dịch với việc tạo giải.
  - Giao diện: menu Tài chính → Giải đấu; thêm/sửa giải và sửa dự toán là hộp thoại theo đường dẫn (`/finance/tournaments/new`, `/:id/edit`, `/:id/budget`); trang chi tiết phủ lên danh sách và giữ bộ lọc khi quay lại. Form phiếu được tách thành một thành phần dùng chung cho Sổ thu chi và trang giải.
  - Kiểm tra: test migration (SQLite), test API, test trang, `check-local.sh` và chạy thử API trên bản build. Chưa chạy được trên Postgres thật ở máy (không có Docker) — cần xem lại sau khi deploy.
