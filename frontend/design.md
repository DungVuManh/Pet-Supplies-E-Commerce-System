# Petjoy — Design rules và constraints cho frontend

Cập nhật: **21/10/2026**. Phạm vi: Customer, Staff và Admin trong frontend Next.js.
Đây là hợp đồng thiết kế để triển khai và review màn hình, không phải xác nhận rằng toàn bộ ứng dụng đã đạt các yêu cầu bên dưới.

## 1. Nguồn chuẩn và cách áp dụng

| Nguồn Figma WDP | Node | Mục đích |
| --- | --- | --- |
| [Styles / Design foundations](https://www.figma.com/design/icvgUyrqj9YruHQyN67vUv/WDP?node-id=19-716) | `19:716` | Màu sắc, typography, spacing |
| [Components](https://www.figma.com/design/icvgUyrqj9YruHQyN67vUv/WDP?node-id=18-3587) | `18:3587` | Button, Input, Card, Table row, Navbar, Tab bar, Status badge, Icons |
| [Customer/Product/Home](https://www.figma.com/design/icvgUyrqj9YruHQyN67vUv/WDP?node-id=18-1594) | `18:1594` | Home công khai; ảnh mẫu người dùng gửi ngày 21/10/2026 là nguồn đối chiếu khi MCP bị giới hạn |
| [Customer/Auth/Login](https://www.figma.com/design/icvgUyrqj9YruHQyN67vUv/WDP?node-id=105-6484) | `105:6484` | Đăng nhập Customer |
| [Customer/Auth/Register](https://www.figma.com/design/icvgUyrqj9YruHQyN67vUv/WDP?node-id=105-6621) | `105:6621` | Đăng ký Customer |
| [Staff/Dashboard/Dashboard](https://www.figma.com/design/icvgUyrqj9YruHQyN67vUv/WDP?node-id=28-53011) | `28:53011` | Shell và mật độ thông tin Staff |
| [Admin/Dashboard/Dashboard](https://www.figma.com/design/icvgUyrqj9YruHQyN67vUv/WDP?node-id=42-15585) | `42:15585` | Shell và màu nhận diện Admin |

Tài liệu phân biệt ba loại thông tin:

- **Figma**: giá trị đã đọc từ Styles, component hoặc màn hình cụ thể.
- **Quy ước dự án**: quyết định bổ sung cho responsive, accessibility, cấu trúc code và kiểm tra. Không được gọi chúng là thông số do Figma cung cấp.
- **Hiện trạng code**: thứ đã tồn tại trong repository, có thể chưa bao phủ hết design system.

Ưu tiên yêu cầu hiện tại của người dùng, sau đó đến node màn hình/variant được chọn và các foundation chung phù hợp với vai trò. Nếu nguồn mâu thuẫn mà chưa rõ cách xử lý, hỏi lại trước khi sửa. Không dùng code đang có để tự hợp thức hóa một điểm lệch thiết kế.

Lượt đối chiếu ngày 20/10 đọc được Styles, metadata Components, token Customer/Admin, dashboard Staff và Status badge. Truy vấn chi tiết Button/Input và tải lại geometry Auth/Admin sau đó bị giới hạn bởi Figma MCP Starter. Geometry Auth/Admin bên dưới dùng dữ liệu đã đọc ở lượt triển khai ngày 20/10; hình thức chi tiết của variant chưa đọc được phải được xác nhận lại khi triển khai. Ngày 21/10, truy vấn lại Home vẫn bị giới hạn: dùng ảnh mẫu người dùng gửi, đồng thời dùng ảnh sản phẩm/icon gốc từ URL asset của lượt đọc Figma trước đó.

## 2. Ngôn ngữ thiết kế

- Giao diện sáng, nền trắng hoặc xám rất nhạt; phân chia khối bằng khoảng cách, viền mảnh và thứ bậc chữ.
- Customer tập trung vào mua sắm và chăm sóc thú cưng; Staff ưu tiên thao tác vận hành; Admin ưu tiên dữ liệu, cấu hình và quản trị.
- Home tại `/` phải mở công khai. Khi chưa có phiên xác thực thật, dùng lời chào chung, danh mục chung và giỏ hàng thực tế của phiên xem; không hiển thị tên Minh Anh, thú cưng Milo/Luna hoặc số thông báo/giỏ hàng mẫu như dữ liệu của khách.
- Giữ tiếng Việt có dấu, nội dung thực tế, nhãn hành động rõ nghĩa như “Đăng nhập”, “Tạo tài khoản”, “Lưu thay đổi”.
- Màu trạng thái dùng cho phản hồi và trạng thái nghiệp vụ. Màu nhận diện dùng cho hành động chính, liên kết và mục điều hướng được chọn.
- Styles ghi rõ: **“Không gradient, không bóng đổ nặng.”** Không thêm gradient, hiệu ứng kính, shadow lớn hay trang trí không có trong màn hình đích.
- Các bản `Petjoy / Đăng nhập` nền ảnh, màu xanh lá là thiết kế riêng. Không lấy màu hoặc bố cục của chúng thay cho `Customer/Auth/Login` và `Customer/Auth/Register` khi chưa được chọn.

## 3. Design tokens

### 3.1. Màu sắc

Các mã ở cột Figma là giá trị nguồn, không có nghĩa mọi token đã được khai báo trong CSS.

| Token Figma | Giá trị | Vai trò / ánh xạ hiện tại |
| --- | --- | --- |
| `Brand/Primary` | `#2563EB` | Customer và Staff; `--color-brand` |
| `Brand/Subtle` | `#EFF6FF` | Nền nhận diện nhạt; `--color-brand-subtle` |
| `Text/Primary` | `#172033` | Nội dung chính; `--color-ink` |
| `Text/Secondary` | `#64748B` | Nội dung phụ; `--color-muted` |
| `Surface/White` | `#FFFFFF` | Bề mặt; `--color-surface` |
| `Surface/Canvas` | `#F8FAFC` | Nền phụ; `--color-canvas` |
| `Border/Default` | `#E2E8F0` | Viền/divider; `--color-line` |
| `Success/Foreground` | `#15803D` | Chữ/icon thành công; chưa có token CSS riêng |
| `Success/Background` | `#F0FDF4` | Nền thành công; chưa có token CSS riêng |
| `Warning/Foreground` | `#B45309` | Chữ/icon cảnh báo; chưa có token CSS riêng |
| `Warning/Background` | `#FFFBEB` | Nền cảnh báo; chưa có token CSS riêng |
| `Danger/Foreground` | `#DC2626` | Màu lỗi trong Figma; xem lưu ý contrast bên dưới |
| `Danger/Background` | `#FEF2F2` | Nền lỗi; chưa có token CSS riêng |
| `Danger/Focus` | `#DB2626` | Màu focus lỗi riêng trong Styles; không tự gộp với foreground |
| `Admin/Color/Brand Teal` | `#0F766E` | Nhận diện Admin; override scoped tại `[data-workspace="admin"]` |
| `Admin/Color/Brand Subtle` | `#EAF5F3` | Nền nhận diện Admin; override scoped tại `[data-workspace="admin"]` |
| `Icons/Black` | `#000000` | Một số asset icon; không thay màu toàn bộ icon thành đen |
| `Components/Canvas` | `#FAFBFE` | Nền board component; không mặc định dùng cho trang sản phẩm |

**Quy ước triển khai:**

- Khai báo token dùng chung trong [app/globals.css](app/globals.css); component dùng `text-ink`, `text-muted`, `bg-brand`, `border-line` hoặc biến ngữ nghĩa tương đương. Không rải lại mã hex trong JSX.
- Khi cần trạng thái mới, bổ sung token còn thiếu trước khi dùng ở nhiều component. Không giả định token trong bảng đã có sẵn.
- Khi triển khai Admin, đặt override nhận diện ở layout/theme Admin; không thay `--color-brand` toàn ứng dụng thành teal.
- Staff dùng shell vận hành, sidebar, metric, bảng và biểu đồ theo bộ màn hình Staff đã cung cấp; dữ liệu nghiệp vụ hiện là mock dùng chung giữa các trang. Admin vẫn dùng shell tối giản và chưa có metric nghiệp vụ. Admin hover `#115E59` là quy ước bổ sung, không phải giá trị đã xác nhận từ Figma.
- `--color-brand-hover: #1D4ED8` là quy ước đang dùng trong code, chưa được xác nhận là màu hover từ Figma. Không coi đây là màu hover chung cho cả Admin.
- `--color-danger` hiện là `#B91C1C`, khác Figma. Trên nền `#FEF2F2`, cặp `#DC2626` chỉ đạt contrast khoảng **4,4148:1**, dưới mức 4,5:1 cho chữ thường; `#B91C1C` đạt khoảng **5,9146:1**. Không ép text lỗi nhỏ sang màu nguồn nếu làm mất khả năng đọc. Giữ khác biệt này được ghi nhận, đo từng cặp foreground/background và thống nhất variant accessible trước khi mở rộng badge lỗi. Đây là phép tính từ mã màu theo công thức WCAG, không phải kết quả audit toàn trang.

### 3.2. Typography

**Figma:** font Inter, trọng lượng thường dùng 400 / 500 / 600 / 700. **Code:** Inter được self-host bằng `next/font/local`, hỗ trợ tiếng Việt; font và OFL nằm ở [app/fonts](app/fonts).

| Vai trò | Size / weight / tracking | Line-height |
| --- | --- | --- |
| Wordmark Customer/Staff | 32px / 700 / -1px | Auto |
| Tiêu đề trang và Auth | 32px / 600 / -0,8px | Auto |
| Lời giới thiệu Auth | 28px / 400 / 0 | Auto |
| Tiêu đề nhóm | 24px / 600 / 0 | Auto; Admin có variant 150% |
| Tiêu đề nhỏ | 20px / 600 / 0 | Auto |
| Giá/số liệu nhỏ | 18px / 600 / 0 | Auto |
| Nội dung | 14px / 400 / 0 | Auto, 150% hoặc 160% theo node |
| Nhãn input | 14px / 500 / 0 | Auto |
| Nút, liên kết nhấn mạnh | 14px / 600 / 0 | Auto |
| Caption / badge | 12px / 400 hoặc 600 / 0 | Auto |

Styles còn có variant 11, 13, 15, 16, 22, 26 và 36px. Chỉ dùng khi màn hình hoặc component đích sử dụng chúng; không tự mở rộng type scale theo sở thích.

- `Auto` trong Figma ánh xạ thành CSS `normal`; số `lineHeight: 100` trong phản hồi MCP không được hiểu thành `100px` hoặc luôn là `1`.
- 150% và 160% ánh xạ thành `1.5` và `1.6`. Variant `56PIXELS` chỉ áp dụng đúng ngữ cảnh bảng của nó, không dùng làm line-height toàn ứng dụng.
- Giữ tracking âm ở tiêu đề theo node. Không áp dụng tracking của wordmark cho mọi đoạn chữ.
- Mỗi trang có một `h1`; dùng heading theo cấu trúc nội dung. Placeholder không thay cho label.
- Không đặt chiều cao cố định cho đoạn chữ để ép khớp ảnh. Nội dung và dấu tiếng Việt phải hiển thị đầy đủ khi xuống dòng hoặc phóng to.

### 3.3. Spacing, viền và bo góc

| Thuộc tính | Nguồn / quy tắc |
| --- | --- |
| Spacing nền tảng | Styles: **8, 16, 24, 32, 48, 64px** |
| Khoảng lớn của Auth | Màn hình Auth: gap 96px, lề 144px ở viewport 1440px |
| Khoảng nhỏ ngoại lệ | Node Auth có gap 12px và 20px; checkbox bo 4px. Không làm tròn chúng thành bội 8 để thay đổi thiết kế |
| Viền thường | 1px, `Border/Default` |
| Control / button | Bo góc 8px |
| Card category Customer | Bo góc 12px theo màn hình tương ứng |
| Card Auth / ảnh giới thiệu | Bo góc 16px |
| Panel/metric Staff | Bo góc 8px; không áp radius Auth cho mọi card |
| Status badge | Pill; Figma dùng radius 100px |

Ưu tiên utility sẵn có như `gap-2`, `gap-4`, `p-6`, `p-8`. Giá trị tùy chỉnh chỉ dùng cho kích thước/variant có nguồn cụ thể; không dùng số lẻ để vá sai layout. Ngoại lệ spacing phải nêu được node hoặc lý do responsive/accessibility.

## 4. Layout và responsive

### 4.1. Mốc desktop từ Figma

Các thông số sau thuộc đúng shell/màn hình được dẫn nguồn, không áp thành kích thước cố định cho mọi trang.

| Khu vực | Mốc tham chiếu |
| --- | --- |
| Frame màn hình mẫu | 1440 × 1024px; không phải chiều cao bắt buộc của trang web |
| Customer navbar / category bar / footer | 88px / 48px / 56px |
| Customer lề navbar/footer tại 1440px | 64px mỗi bên |
| Home banner / ảnh banner | Cao 184px; ảnh 344 × 184px ở desktop |
| Home danh mục / sản phẩm | 4 cột ở desktop; danh mục gap 16px, sản phẩm gap 24px; ảnh sản phẩm cao 160px |
| Auth khối nội dung | Rộng 1152px, căn giữa; 520px giới thiệu + 96px gap + 536px form |
| Auth ảnh giới thiệu | 520 × 278px, giữ tỉ lệ và cách crop theo nguồn |
| Auth card | Padding 32px, radius 16px |
| Login / Register card tham chiếu | Cao 550px / 764px khi chưa có lỗi; không khóa chiều cao trong code |
| Staff sidebar / topbar | 232px / 72px |
| Staff sidebar padding / khoảng giữa các panel | 24px / 24px |
| Admin sidebar / navbar | 224px / 80px, theo dashboard đã đọc trước đó |

**Ràng buộc layout:** dùng Flex/Grid cho bố cục và `min-width: 0` cho phần co giãn. Absolute positioning chỉ phù hợp với overlay, trang trí hoặc nội dung cần hệ tọa độ riêng; không sao chép tọa độ canvas Figma thành vị trí cố định của toàn trang.

### 4.2. Quy ước responsive của dự án

Các breakpoint dưới đây là quyết định triển khai hiện tại, không phải breakpoint xuất từ Figma.

| Viewport | Hành vi Auth |
| --- | --- |
| < 640px | Một cột; ẩn welcome panel; lề nội dung 16px, card padding 24px; header search xuống hàng riêng |
| 640–1023px | Một cột, form tối đa 536px; lề nội dung 24px, card padding 32px |
| 1024–1279px | Hai cột linh hoạt, gap 48px; ảnh co theo cột, không ép welcome rộng 520px |
| ≥ 1280px | Auth tối đa 1152px, cột 520px + gap 96px + form 536px |

- Dùng cùng breakpoint và container giữa các trang cùng shell; không tạo breakpoint riêng cho từng lỗi hiển thị.
- Footer nằm sau nội dung, có thể xuống dưới viewport khi form dài. Không ghim footer lên form hoặc cắt lỗi validation để giữ khung 1024px.
- Body không cuộn ngang ở 320px. Bảng dữ liệu và dải category có thể cuộn ngang trong vùng riêng; nội dung chính vẫn phải reflow.
- Staff/Admin trên màn hình nhỏ: thu shell thành một cột, sidebar thành điều hướng có thể mở/đóng và truy cập bằng bàn phím; bảng có vùng cuộn riêng. Staff đã triển khai quy ước này; Admin áp dụng khi mở rộng shell.
- Kiểm tra ở **320, 768, 1024, 1440px**, viewport thấp và zoom 200%. Không che nội dung thiết yếu để làm ảnh chụp trông gọn.
- Home: danh mục 2 cột dưới 1024px, 4 cột từ 1024px; sản phẩm 1 cột dưới 640px, 2 cột ở 640–1023px, 4 cột từ 1024px. Banner xếp dọc dưới 768px; nội dung được xuống dòng và tăng chiều cao. Đây là quy ước responsive bổ sung theo bố cục desktop.

## 5. Component và trạng thái tương tác

| Nhóm | Cơ sở Figma | Constraint triển khai |
| --- | --- | --- |
| Button | Primary, Secondary, Danger, Icon; Primary Disabled | Nút thường 48px; Icon 32 × 32px. Staff có CTA 40px. Giữ biến thể theo ngữ cảnh; nút submit phải có type rõ ràng |
| Input | Text Empty/Filled/Focus/Error; Select; Textarea | Control một dòng 48px; label 14px/500; gap label 8px; tổng field cơ bản 73px. Hint/error làm field tự tăng chiều cao |
| Checkbox | Ô chọn và nhãn trong Auth | Ô 16px; label bấm được, trạng thái checked và focus rõ ràng; liên kết hint/error bằng ARIA |
| Card | Product, Category, Pet, Address, Notification Read/Unread | Dùng đúng cấu trúc và radius theo variant; không tạo một card chung với hàng chục cờ điều kiện |
| Table row | Cart, Checkout và các trạng thái Order | Dùng bảng HTML cho dữ liệu bảng; giữ header/column semantics, căn tiền và số nhất quán; không dùng chiều cao dòng để cắt dữ liệu |
| Navbar / Tab bar | Navbar Cart Empty/Filled; tab Product/Order/Notification | Tách theo shell; chỉ báo active bằng cả trạng thái truy cập được, không chỉ màu |
| Status badge | Pending, Shipping, Completed, Cancelled, Paid, Default Address, Neutral | Chữ 12px/600; Pending vàng, Shipping/Default Address xanh dương, Completed/Paid xanh lá, Cancelled đỏ, Neutral xám; kiểm tra contrast |

Component tương tác cần default, hover khi có pointer, focus-visible và disabled khi áp dụng. Form submit có trạng thái đang xử lý khi thực sự gọi API; chống submit lặp. Màu/opacity chính xác của variant chưa đọc được phải lấy lại từ Figma hoặc ghi thành quyết định bổ sung, không tự nhận là đã khớp nguồn.

Với màn hình có dữ liệu từ xa, thiết kế đủ **loading, empty, error và có dữ liệu**. Empty giải thích bước tiếp theo; error có cách phục hồi phù hợp; loading giữ cấu trúc vùng nội dung. Không dùng dữ liệu thành công giả để che lỗi hoặc biến loading thành empty.

## 6. Form và phạm vi Auth hiện tại

- Tái sử dụng `TextField`, `Checkbox`, `Button`, `AuthCard`, `AuthWelcome` và `AuthNotice`; logic tương tác ở hook, quy tắc validation ở module thuần.
- Validation hiển thị sau lần submit đầu và cập nhật khi người dùng sửa. Focus trường sai đầu tiên; lỗi đặt cạnh trường và có câu hướng dẫn rõ ràng.
- Dùng đúng `type`, `required`, `autoComplete`, `aria-invalid`, `aria-describedby`; không gửi mật khẩu qua query string hoặc ghi vào console/storage.
- Login gồm email, mật khẩu, ghi nhớ đăng nhập và liên kết khôi phục mật khẩu qua email. Theo phạm vi Firebase đã thống nhất, số điện thoại chỉ là thông tin liên hệ trong hồ sơ, không dùng để đăng nhập.
- Register gồm họ tên, điện thoại, email, mật khẩu, xác nhận và đồng ý điều khoản. Theo yêu cầu cập nhật của người dùng ngày 21/10/2026, mật khẩu cần hơn 6 ký tự không tính khoảng trắng (tối thiểu 7 ký tự), không bắt buộc chữ hoa, chữ thường hoặc số; quy tắc này thay yêu cầu mật khẩu cũ trong Figma. Chỉ bỏ khoảng trắng khi đếm độ dài; giữ nguyên mật khẩu gửi Firebase và yêu cầu xác nhận khớp chính xác. Quy tắc điện thoại Việt Nam và độ dài họ tên hiện là quy ước code, không phải kết quả suy ra từ layout.
- Auth dùng Firebase Email/Password và API Express/MongoDB. Chỉ thông báo thành công khi backend lưu/đọc được hồ sơ và cấp session cookie. Có trạng thái chờ, lỗi, thử lại và hoàn tất hồ sơ còn thiếu; không hiển thị tên khách hàng giả. Header đọc phiên thật qua `/auth/me`, có nút đăng xuất. Session dùng cookie HttpOnly; không lưu mật khẩu/token vào localStorage hoặc sessionStorage.
- Home vẫn công khai. Danh mục và giỏ hàng dùng sản phẩm mẫu trong bộ nhớ, reset giỏ khi tải lại toàn trang; checkout/policy/ưu đãi chưa triển khai. Chưa bắt buộc xác minh email; chưa có Google hoặc OTP điện thoại.
- Giữ validation server; không coi client validation là lớp bảo mật. Trang `/forgot-password` tái sử dụng AuthCard/TextField/Button và thông báo chung để tránh tiết lộ email đã đăng ký.

## 7. Assets, accessibility và nội dung

### Assets

- Dùng đúng ảnh/icon do Figma cung cấp tại đúng vị trí thiết kế. Không thay bằng emoji, ảnh stock khác, icon gần giống hoặc cả ảnh chụp màn hình thay cho UI.
- Lưu asset lâu dài trong `public/images`, `public/icons` hoặc module asset phù hợp. Không đưa URL MCP tạm thời vào runtime.
- Ảnh dùng `next/image` khi phù hợp; khai báo kích thước/tỉ lệ và `sizes` theo slot. Ảnh sản phẩm không bị kéo méo; cách crop theo node đích.
- SVG giữ nguyên root dimensions/viewBox và tỉ lệ; không dùng CSS toàn cục ép tất cả SVG cùng kích thước. Icon trang trí có alt rỗng, nút chỉ có icon cần tên truy cập được.

### Accessibility — quy ước dự án

- Chữ thường đạt contrast **≥ 4,5:1**, chữ lớn **≥ 3:1**, xét trên nền thực tế. Không làm tròn số dưới ngưỡng thành “đạt”. Xem [WCAG 2.2 — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- Target tương tác đáp ứng **24 × 24 CSS px hoặc điều kiện spacing/ngoại lệ của WCAG**. Với nút độc lập trên cảm ứng, dự án ưu tiên vùng chạm 44 × 44px; đây là quy ước bổ sung, không phải kích thước của mọi icon Figma. Xem [Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- Nội dung reflow ở chiều rộng 320 CSS px; ngoại lệ cho phần thực sự cần bố cục hai chiều như bảng phải nằm trong vùng riêng. Xem [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
- Tab order theo thứ tự sử dụng; mọi hành động dùng được bằng bàn phím. Focus phải nhìn thấy, không bị clip hoặc bị header/modal che.
- Dùng phần tử native phù hợp: link để điều hướng, button cho hành động, label cho control. Không dùng div có click thay cho button.
- Nội dung lỗi/thành công có chữ giải thích; không dựa chỉ vào đỏ/xanh. Feedback phù hợp dùng `role="alert"` hoặc `role="status"`.
- Nếu có dialog: quản lý focus, đóng bằng Escape và trả focus về trigger; motion phải tôn trọng reduced motion.

Nội dung tiếng Việt không viết cứng khoảng trắng để căn cột. Tiền hiển thị theo locale `vi-VN`/VND khi là dữ liệu động; giá trị mẫu từ Figma phải được phân biệt với dữ liệu thực.

## 8. Kiến trúc code và tái sử dụng

```text
app/                          Route, layout, metadata; page mỏng
  (customer)/(auth)/          /login và /register
  (customer)/page.tsx         Home công khai tại /
components/ui/                Control dùng chung, không chứa nghiệp vụ Auth
components/storefront/        Header/footer Customer
features/<feature>/components/ Component theo nghiệp vụ
features/<feature>/           Hook, validation và logic thuộc feature
features/catalog/, cart/      Catalog mẫu/tìm kiếm; state và dialog giỏ hàng khách
public/images/, public/icons/ Asset tĩnh
app/fonts/                    Font local và license
```

- UI primitive chỉ nhận props cho hiển thị/hành vi chung; không import feature, router nghiệp vụ hoặc gọi API tài khoản.
- Chia sẻ component khi cùng mục đích và hợp đồng tương tác; khác biệt thực sự giữa các vai trò dùng composition hoặc variant nhỏ, có kiểu dữ liệu rõ ràng.
- Layout/page giữ Server Component khi không cần tương tác. Đặt `"use client"` tại ranh giới cần state, event hoặc browser API.
- Giữ TypeScript strict. Không thêm `any`, `@ts-ignore`, `eslint-disable`, tắt strict hoặc bỏ test chỉ để vượt qua kiểm tra.
- Không thêm thư viện UI, icon, form hoặc state management chỉ để thay vài dòng đã có. Mọi dependency mới cần lý do cụ thể.
- Không tạo tầng trừu tượng, state toàn cục hay component cho tính năng chưa có nhu cầu. Không sao chép nguyên JSX xuất từ Figma làm code sản phẩm mà bỏ qua component và token hiện có.
- Màu/status nghiệp vụ phải có mapping tập trung khi được triển khai; không viết lại mapping ở từng bảng/trang.

## 9. Constraint và cách nghiệm thu

Các quy tắc này là **gate review bằng tài liệu**. Repository hiện có test, ESLint và build; chưa có CI/visual regression/axe tự động để cưỡng chế toàn bộ design contract. Không ghi “đã pass” cho phép đo chưa chạy.

| ID | Điều kiện bắt buộc cho thay đổi UI | Kiểm tra / bằng chứng |
| --- | --- | --- |
| D01 | Đúng node, vai trò, nội dung và biến thể được chọn | Ghi node nguồn trong mô tả thay đổi; đối chiếu Figma |
| D02 | Token ngữ nghĩa; không rải mã màu mới ngoài nơi định nghĩa | Review diff component và `app/globals.css` |
| D03 | Spacing/radius/type đúng nguồn; ngoại lệ được giải thích | Đọc computed styles, đo container và control trên browser |
| D04 | Không tràn ngang body ở 320/768/1024/1440px; lỗi không bị cắt | Browser; so `scrollWidth` với `clientWidth`, kiểm tra vùng cuộn ngoại lệ |
| D05 | Đúng ảnh/icon, file local không rỗng và tải thành công | Kiểm tra file, network và hình render; không có URL MCP tạm |
| D06 | Đủ trạng thái liên quan, dùng bàn phím được, label/focus/error rõ | Thử submit trống/sai/đúng, Tab/Enter; đo contrast theo mục 7 |
| D07 | Tái sử dụng control/shell; feature logic đúng tầng | Review import và ranh giới component |
| D08 | Không lỗi TypeScript/ESLint; các test liên quan đạt; build đạt | Các lệnh bên dưới phải exit 0 |
| D09 | Không lỗi console hoặc request hỏng do thay đổi gây ra | Console/network của màn hình được sửa; tách lỗi có sẵn |
| D10 | Không giả mạo kết quả nghiệp vụ hoặc lộ thông tin nhạy cảm | Review handler và thử luồng frontend preview/API thực |
| D11 | Không hạ chuẩn để làm thay đổi pass | Diff không bỏ assertions, skip test, tắt kiểm tra hoặc xóa constraint |

Chạy từ repository root khi thay đổi code UI:

```powershell
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend exec -- tsc --noEmit
npm --prefix frontend run build
```

Với thay đổi chỉ ở tài liệu, kiểm tra link, nguồn, cấu trúc Markdown và `git diff --check`; không cần chạy lại build chỉ để xác nhận văn bản.

Review trực quan ở **1440 × 1024, zoom 100%**, với đúng font và nội dung mẫu, sau đó kiểm tra responsive. So thứ bậc, vị trí khối, chiều rộng, spacing, wrapping và trạng thái; không lấy khác biệt anti-aliasing làm lý do đổi font/kích thước. Nếu nội dung động/validation dài hơn mẫu, ưu tiên nội dung đầy đủ và layout co giãn.

Chưa thiết lập ngân sách bundle, coverage %, Lighthouse hoặc LCP/CLS vì chưa đo baseline. Khi thêm một ngưỡng, phải ghi giá trị đo, công cụ/lệnh, môi trường và cách xử lý thất bại; không tự gắn điểm hiệu năng chưa đo vào tài liệu.

## 10. Cập nhật và ngoại lệ

Mỗi thay đổi quy tắc phải nêu nguồn/node hoặc lý do kỹ thuật, phạm vi, người chịu trách nhiệm và mốc xem lại. Không thay quy tắc toàn cục chỉ để giải quyết một trang. Nếu cần thay đổi hình thức đã thống nhất mà nguồn chưa rõ, hỏi người dùng trước khi thực hiện.

| ID | Khác biệt / giới hạn đã biết | Cách xử lý |
| --- | --- | --- |
| COLOR-01 | CSS danger `#B91C1C` khác nguồn `#DC2626`; text đỏ trên nền đỏ nhạt có rủi ro thiếu contrast | Giữ ghi nhận và đo từng cặp; thống nhất token accessible khi triển khai tiếp, không đổi CSS trong lượt viết tài liệu này |
| STATE-01 | Màu hover `#1D4ED8` và focus ring hiện tại là quy ước code | Lấy lại chi tiết variant khi Figma MCP cho phép; không quảng bá là Figma-exact |
| SOURCE-01 | Chi tiết Button/Input và tải lại geometry Auth/Admin bị giới hạn truy vấn | Dùng metadata/nguồn đã đọc; xác minh lại trước khi sửa các variant chưa kiểm tra |
| SCOPE-01 | Theme/shell Staff/Admin và nhiều variant mới có trên thiết kế, chưa có trong code | Triển khai khi feature cần; bảng token không phải danh sách component đã hoàn thành |

Các điểm trên là danh sách cần đối chiếu, không phải quyền bỏ qua accessibility hoặc hạ chuẩn kiểm tra. Chủ sở hữu cần được xác định ở thay đổi triển khai liên quan; không coi các điểm chưa có người phụ trách là ngoại lệ phát hành đã được duyệt.
