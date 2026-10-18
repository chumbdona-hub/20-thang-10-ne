# 20/10 – Một món quà của 11B7 🌸

Một website cuộn kể chuyện (scroll-story) dành tặng **16 cô gái lớp 11B7** nhân ngày Phụ nữ Việt Nam 20/10. Trang có hộp quà mở màn, hoa 3D nhiều lớp cánh, thư giấy, thẻ lật 3D cho từng bạn, dải ngân hà lời chúc, một "cảnh phim" lyric toàn màn hình với trái tim hạt 3D, và phần kết dưới trời sao.

Dự án chạy bằng **React + Vite + CSS thuần**, được chia nhiều file, không dùng `localStorage`, và sẵn sàng đưa lên GitHub Pages.

---

## 1. Cấu trúc thư mục

```
.
├── index.html                  Khung HTML, meta, font, loader tĩnh hiện ngay
├── favicon.svg                 Favicon hoa vẽ bằng SVG
├── .nojekyll                   Bỏ qua xử lý Jekyll khi deploy Pages
├── README.md
├── public/
│   ├── .nojekyll
│   ├── favicon.svg
│   └── assets/
│       ├── audio/.gitkeep      ← thả song.mp3 vào đây (xem mục 3)
│       └── img/.gitkeep
└── src/
    ├── main.tsx                Điểm khởi động React
    ├── App.tsx                 Lắp ráp nền, màn hình quà, các section, cảnh phim
    ├── data/config.ts          Tên lớp, danh sách bạn, lời chúc, thư kết, bpm…
    ├── data/lyrics.ts          Nguyên văn phụ đề SRT
    ├── lib/
    │   ├── srt.ts              parseSRT (BOM, CRLF, mốc thời gian)
    │   ├── audio.ts            Web Audio: nhạc hộp nhạc, hiệu ứng, song.mp3
    │   ├── loop.ts             Một vòng requestAnimationFrame chung
    │   ├── utils.ts            lerp, clamp, màu, xáo trộn, tên gọi
    │   └── fx.ts               Pháo hoa cánh hoa/trái tim, vệt lấp lánh
    ├── hooks/useReveal.ts      IntersectionObserver cho hiệu ứng hiện dần
    ├── components/
    │   ├── Background.tsx      Gradient đổi màu liên tục theo vị trí cuộn
    │   ├── ProgressBar.tsx     Thanh tiến độ cuộn
    │   ├── GiftScreen.tsx      Section 0 – hộp quà
    │   ├── Hero.tsx            Section 1 – intro hoa 3D
    │   ├── LetterSection.tsx   Section 2 – lời mở đầu
    │   ├── GirlsSection.tsx    Section 3 – 16 thẻ lật 3D
    │   ├── WishesSection.tsx   Section 4 – dải ngân hà lời thương
    │   ├── FinaleSection.tsx   Section 5 – đoạn kết
    │   ├── Cinema.tsx          Section 1.5 – lyric + trái tim hạt
    │   └── art/FlowerArt.tsx   Hoa, gấu, bướm, bóng bay vẽ SVG
    └── styles/
        ├── loader.css          Màn hình "Đang gói quà"
        ├── base.css            Biến màu, reset, kiểu chữ chung
        ├── background.css      Lớp nền cố định
        ├── gift-hero.css       Hộp quà + intro
        ├── landscape.css       Cảnh phim ngang
        ├── letter-girls.css    Lá thư + thẻ các bạn
        ├── wishes.css          Sân khấu lời chúc
        ├── finale.css          Đoạn kết
        └── responsive.css      Media query + giảm chuyển động
```

> Ghi chú: bản dựng dùng Vite để đóng gói các module JS/CSS rời thành `dist/index.html` (tiện cho GitHub Pages). Mọi nội dung, bố cục và hiệu ứng vẫn được tách thành nhiều file như trên.

---

## 2. Chạy thử trên máy

Cần **Node.js 18+**.

```bash
npm install
npm run dev        # mở link Vite in ra (thường là http://localhost:5173)
```

Bản tĩnh để xem thử:

```bash
npm run build
npm run preview
```

Nếu chỉ muốn xem nhanh bản đã build, có thể mở `dist/index.html` bằng Live Server (khuyến nghị) vì một số trình duyệt chặn tài nguyên khi mở trực tiếp bằng `file://`.

---

## 3. Thêm nhạc `song.mp3`

Trang **không có** file nhạc sẵn. Khi chưa có nhạc, cảnh phim vẫn chạy bình thường bằng đồng hồ nội bộ và nhịp tự tạo theo `bpm`; không có thông báo lỗi nào trên giao diện.

Cách thêm (không cần sửa code):

1. Đặt file vào `public/assets/audio/song.mp3` **trước khi** chạy `npm run build`.
2. Nếu đã build xong, chép thẳng file vào `dist/assets/audio/song.mp3` (đúng chữ thường `song.mp3`).
3. Trên GitHub, tải file lên thư mục `public/assets/audio/song.mp3` (hoặc `dist/assets/audio/` nếu bạn deploy nhánh chứa bản build).
4. Đường dẫn trong code là tương đối: `assets/audio/song.mp3`, nên chạy đúng cả khi trang nằm trong thư mục con của GitHub Pages.

Lưu ý: nhạc chỉ bắt đầu sau lần chạm đầu tiên ở màn hình **"Chạm để mở quà"**, đúng chính sách autoplay của trình duyệt. Trang không có nút bật/tắt âm thanh — hãy chỉnh bằng phím âm lượng của thiết bị.

---

## 4. Chỉnh nhịp / độ dài

Mở `src/data/config.ts`:

```ts
song: {
  url: "assets/audio/song.mp3",
  bpm: 100,          // nhịp mỗi phút, dùng cho hiệu ứng nhấp nháy và trái tim đập
  beatOffset: 0,     // lệch phách đầu (giây), tăng/giảm để khớp bản nhạc
  duration: 59,      // tổng độ dài "cảnh phim" (giây)
  heartDuration: 5.133, // 5.13s cuối: trái tim hạt xuất hiện & đập theo nhịp
}
```

Mốc thời gian lyric được tính tự động từ dữ liệu SRT trong `src/data/lyrics.ts`; không cần sửa tay. Khi thay file SRT, chỉ cần giữ nguyên định dạng `HH:MM:SS,mmm --> HH:MM:SS,mmm`.

Bản SRT hiện tại có phụ đề từ **8,633s** đến **53,867s**. Vì vậy cảnh phim bắt đầu bằng **8,6 giây mở màn không chữ, chỉ có nhạc và hiệu ứng nền**, rồi lyric mới xuất hiện. Khi lyric kết thúc, trái tim hạt 3D hiện ra, đập theo nhịp và biến mất ở giây thứ **59**. Nếu thay SRT dài/ngắn hơn, hãy đặt `duration` lớn hơn mốc cuối một chút (ví dụ 59) và chỉnh `heartDuration` tương ứng.

---

## 5. Sửa lời chúc / tên các bạn

Tất cả nằm trong `src/data/config.ts`:

- `girls`: danh sách họ tên đầy đủ. Tên gọi và chữ cái avatar được lấy tự động từ từ cuối của tên.
- `messages`: lời chúc hiện trên thẻ lật và trên dải ngân hà (nên giữ mỗi câu ngắn dưới ~70 ký tự để hiển thị đẹp).
- `introLetter`: 5 dòng cho lá thư mở đầu.
- `finalLetter`: các dòng của lá thư kết (kết thúc tự động bằng `— Các bạn nam lớp 11B7 —`).
- `senderName`, `className`, `year`: tên lớp, năm và người gửi.

Sau khi sửa, chạy lại `npm run dev` (hoặc `npm run build`).

---

## 6. Đưa lên GitHub Pages

1. Tạo repository mới và tải toàn bộ mã nguồn lên nhánh `main`.
2. Chạy `npm run build`. Thư mục `dist/` chứa bản tĩnh hoàn chỉnh (file `.nojekyll` và `assets/` đã có sẵn).
3. Có hai cách phổ biến:
   - **Cách nhanh:** đưa nội dung thư mục `dist/` lên một nhánh, ví dụ `gh-pages`, rồi vào **Settings → Pages → Deploy from a branch**, chọn nhánh đó và thư mục `/ (root)`.
   - **Cách gọn:** đưa toàn bộ mã nguồn lên `main`, vào **Settings → Pages → Source: GitHub Actions**, thêm workflow dựng Vite rồi deploy thư mục `dist`.
4. Bấm **Save**, đợi 1–2 phút, GitHub sẽ hiện link dạng:
   `https://<tên-tài-khoản>.github.io/<tên-repo>/`
5. Mở link để kiểm tra trên điện thoại. Mọi đường dẫn đều tương đối nên chạy tốt trong thư mục con.
6. Nếu dự định thêm `song.mp3` **sau** khi deploy, hãy tải file vào đúng thư mục `assets/audio/` của bản đang được Pages phục vụ, đúng tên chữ thường.

---

## 7. Tạo QR từ link

1. Copy link GitHub Pages ở bước 6.
2. Dùng một dịch vụ tạo QR miễn phí (ví dụ `qr-code-generator.com`, `me-qr.com`) hoặc chạy:
   `npx qrcode-terminal "https://<tài-khoản>.github.io/<repo>/"`
3. Tải ảnh QR, in kèm lời nhắn "Quét để mở món quà của 11B7 🌸" rồi dán vào thiệp/thiệp lớp.
4. Nhớ kiểm tra QR bằng điện thoại trước khi in hàng loạt.

---

## 8. Ghi chú kỹ thuật

- Toàn bộ hoa, gấu, bướm, bóng bay được vẽ bằng **SVG/CSS 3D**, không cần WebGL, nên trang vẫn đẹp và đủ nội dung trên mọi thiết bị.
- Chuyển động dùng `transform`/`opacity`; hiệu ứng hạt chạy chung một `requestAnimationFrame`; tạm dừng khi tab ẩn.
- Tôn trọng `prefers-reduced-motion`; thiếu API (Fullscreen, Orientation lock, vibrate…) thì bỏ qua êm.
- Ảnh hoa 3D nhiều lớp cánh xếp xoắn ốc, có hiệu ứng nở, nghiêng theo con trỏ, kéo để xoay và chạm để hoa rung.
- Lời chúc luôn hiển thị **một thẻ tại một thời điểm** trong sân khấu riêng, không thể chồng chữ lên nhau hay tràn lên tiêu đề.
- Thẻ của các bạn nữ **giữ nguyên lời nhắn** sau khi mở, chỉ gấp lại khi người xem bấm nút “Đọc xong rồi, gấp lại”. Mỗi lúc chỉ render một mặt thẻ (không dùng `backface-visibility` hay hai mặt chồng lên nhau), nên lời nhắn luôn hiển thị trên Safari/iOS và mọi trình duyệt di động.
- Chế độ **lite** tự bật khi máy yếu (RAM/CPU thấp) hoặc khi FPS tụt dưới ~44: giảm số hạt, hạ DPR canvas, vẽ 30fps, tắt các animation trang trí và `backdrop-filter`. Nội dung và hiệu ứng chính vẫn giữ nguyên.
- Không sử dụng `localStorage`/`sessionStorage`.

Chúc các bạn gái 11B7 một ngày 20/10 thật rạng rỡ. 💐
