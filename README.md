# 20/10 – Một món quà của 11B7 🌸

Một website cuộn kể chuyện (scroll-story) dành tặng **các cô gái lớp 11B7** nhân ngày Phụ nữ Việt Nam 20/10. Trang có hộp quà mở màn, hoa 3D nhiều lớp cánh, thư giấy, ô nhập tên để nhận lời chúc riêng, chòm sao 16 bạn, dải ngân hà lời chúc, một "cảnh phim" vũ trụ với tinh cầu ngọc trai và trái tim hạt 3D, vườn hoa lời chúc và phần kết dưới trời sao.

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
    ├── data/wishes.ts          Lời chúc riêng 16 bạn, fallback, bất ngờ cô giáo
    ├── data/lyrics.ts          Nguyên văn phụ đề SRT
    ├── lib/text.ts             Bỏ dấu tiếng Việt, khớp tên, wrapByWords, auto-fit
    ├── lib/nameUtils.ts        Tên gọi, chữ cái avatar, viết hoa tên
    ├── lib/
    │   ├── srt.ts              parseSRT (BOM, CRLF, mốc thời gian)
    │   ├── audio.ts            Web Audio: nhạc hộp nhạc, hiệu ứng, song.mp3
    │   ├── loop.ts             Một vòng requestAnimationFrame chung
    │   ├── utils.ts            lerp, clamp, màu, xáo trộn, tên gọi
    │   └── fx.ts               Pháo hoa cánh hoa/trái tim, vệt lấp lánh
    ├── hooks/usePhoto.ts       Tải ảnh lười + hot-swap
    ├── hooks/useAlbum.ts       Tải thumbnail cả lớp (tối đa 4 cùng lúc)
    ├── lib/photos.ts           slug, tải, resize canvas, LRU, focus, debug
    ├── hooks/useReveal.ts      IntersectionObserver cho hiệu ứng hiện dần
    ├── components/
    │   ├── Background.tsx      Gradient đổi màu liên tục theo vị trí cuộn
    │   ├── SectionBoundary.tsx Lỗi một section không làm sập cả trang
    │   ├── NameWish.tsx        Overlay lời chúc + tên bằng hạt + thiệp thư
    │   ├── ConstellationSection.tsx  Section 3.5 – chòm sao 11B7
    │   ├── GardenSection.tsx   Section 4.5 – vườn hoa lời chúc
    │   ├── PhotoFrame.tsx      Khung ảnh dùng chung (ô tạm + rửa ảnh)
    │   ├── PhotoWall.tsx       Bức tường polaroid
    │   ├── Gallery3D.tsx       Phòng triển lãm 3D
    │   ├── HeartMosaic.tsx     Trái tim ghép ảnh
    │   ├── MemoryMovie.tsx     Phim kỷ niệm
    │   ├── MovieButton.tsx     Nút mở phim (tự ẩn khi chưa có ảnh)
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

### Cách dùng các phần mới

- **Lời chúc riêng:** vào mục 02, gõ tên (có dấu/không dấu đều được) rồi chọn gợi ý hoặc bấm “Gửi lời chúc”. Bấm trực tiếp một thẻ tên cũng mở cùng một màn hình lời chúc.
- **Tên lạ:** vẫn nhận được lời chúc chung, điền đúng tên bạn đã gõ.
- **Bất ngờ cô giáo:** gõ đúng họ tên cô (kèm “cô” hoặc “cô giáo” đều được) — mục `TEACHER` trong `src/data/wishes.ts`. Tên cô không xuất hiện trong gợi ý hay bất kỳ chỗ nào trên trang.
- **Chòm sao 11B7:** chạm một ngôi sao để mở lời chúc; kéo nhẹ để xoay bầu trời.
- **Vườn hoa:** chạm vào mặt đất để gieo hoa kèm một lời chúc (tối đa 40 bông, máy yếu 20 bông).
- **Bức tường kỷ niệm:** polaroid các bạn có ảnh; kéo để xê dịch, chạm để mở lời chúc. Chưa có ảnh nào thì hiện 6 tấm mẫu.
- **Phòng triển lãm 3D:** vuốt để xoay vòng khung ảnh, chạm khung trước để mở lời chúc (khung khác sẽ được xoay ra trước).
- **Trái tim 11B7:** ~60 ô ảnh ghép thành trái tim, đập theo bpm; chạm một ô để mở lời chúc.
- **Phim kỷ niệm:** nút trong phần kết, tự ẩn khi chưa có ảnh; chạm màn hình để tạm dừng/tiếp tục, có nút Đóng và hỗ trợ nút Back.
- **Quả cầu “trái tim” của cảnh phim:** thân ngọc trai nhiều lớp, 3 quầng sáng, vòng sóng nhạc (64 vạch, 32 vạch ở chế độ lite), 3 quỹ đạo có vệ tinh, thiên hà xoáy ~320 hạt, tia sáng, điện hoa, 3 vòng xung kích và 3 mặt trăng nhỏ. Quả cầu chiếm ~20–24% chiều cao màn hình, nảy và đổi màu mỗi mốc lyric, phát chữ/hút chữ vào tâm, lõi sáng khi trái tim xuất hiện và tự tắt khi hết phim. Chạm để bắn tim, giữ ~350ms để “sạc” rồi thả sóng lớn. File: `src/components/cinema/Orb.tsx`, `src/styles/orb.css` (tương ứng `js/landscape/orb.js`). API tương đương: `onCue`, `setPalette`, `setPhase`, `emitText`, `absorbText`, `pointer`, `dim`, `dispose`.
- **Cảnh phim:** ở cổng vào, chạm tinh cầu để bắt đầu và mở khoá âm thanh; không chạm thì sau 10 giây cảnh vẫn tự chạy nhưng iOS có thể không phát nhạc. Kéo để xoay camera, pinch để zoom, giữ 350ms để hút hạt, chạm để thả tim.

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

## 3. Cách thêm ảnh

Ảnh nằm trong `public/assets/photos/` (bản build sẽ nằm ở `dist/assets/photos/`). Tên file sinh tự động từ họ tên: bỏ dấu tiếng Việt, bỏ khoảng trắng/ký tự đặc biệt, viết thường, đuôi **`.jpeg`**:

| Họ và tên | Tên file |
|---|---|
| Mai Thị Vân Anh | `maithivananh.jpeg` |
| Nguyễn Thị Tùng Chi | `nguyenthitungchi.jpeg` |
| Nguyễn Ngọc Diệp | `nguyenngocdiep.jpeg` |
| Vũ Việt Hà | `vuvietha.jpeg` |
| Nguyễn Ngọc Hân | `nguyenngochan.jpeg` |
| Nguyễn Thị Thu Hiền | `nguyenthithuhien.jpeg` |
| Hoàng Xuân Mai | `hoangxuanmai.jpeg` |
| Phạm Nhật Thanh Minh | `phamnhatthanhminh.jpeg` |
| Lưu Khánh Nhi | `luukhanhnhi.jpeg` |
| Trịnh Vy Oanh | `trinhvyoanh.jpeg` |
| Phan Thị Minh Phương | `phanthiminhphuong.jpeg` |
| Bùi Minh Thư | `buiminhthu.jpeg` |
| Trần Ngọc Bảo Trân | `tranngocbaotran.jpeg` |
| Nguyễn Hà Trang | `nguyenhatrang.jpeg` |
| Nguyên Tùng Chi | `nguyentungchi.jpeg` |
| Nguyễn Thu Trang | `nguyenthutrang.jpeg` |
| Cô Hoàng Thị Hoa (chỉ dùng trong màn hình lời chúc riêng) | `hoangthihoa.jpeg` |

> Tên file luôn sinh bằng hàm `slug()` trong `src/lib/photos.ts`; bảng trên chỉ để tra nhanh. Nếu sửa danh sách trong `src/data/config.ts`, hãy dùng đúng quy tắc slug. Chạy trang với `?debug` để xem bảng **tên → tên file → có/chưa có ảnh** trong Console.
>
> Tên file trong bảng được sinh trực tiếp từ `slug()` của danh sách trong `src/data/config.ts`. Nếu đổi tên bạn nào, mở `?debug` để xem tên file mới.

**Cách thêm:**

1. Nén ảnh còn khoảng **900–1200px cạnh dài**, mỗi ảnh **≤ ~250KB** để tải nhanh trên 4G.
2. Đặt tên đúng bảng trên, **chữ thường**, đuôi **`.jpeg`** (các đuôi `.jpg/.png/.webp` chỉ là dự phòng).
3. Thả vào `public/assets/photos/`, sau đó chạy `npm run build` rồi commit/deploy thư mục `dist/`. Không cần sửa code; chỉ cần tải lại trang là ảnh hiện.
4. Ảnh dọc được trình duyệt tự xoay theo EXIF; trang vẽ lại qua canvas và cắt theo `object-position: 50% 25%` (ưu tiên khuôn mặt phía trên). Muốn chỉnh từng ảnh, thêm vào `CONFIG.photoFocus`: `"slugten": "50% 30%"`.
5. Ảnh thiếu là bình thường: mọi khung hiển thị ô pastel có chữ cái đầu, không có thông báo lỗi.

**Quyền riêng tư:** GitHub Pages là **công khai**. Hãy xin phép từng bạn và cô giáo trước khi đăng ảnh; có thể để repo ở chế độ hạn chế khi chia sẻ nội bộ. Trang đã đặt `<meta name="robots" content="noindex,nofollow">` để hạn chế công cụ tìm kiếm, nhưng đây không phải bảo mật tuyệt đối. Ảnh cô giáo **chỉ được tải khi nhập đúng tên cô** trong màn hình lời chúc; không xuất hiện trong gợi ý, tường ảnh, chòm sao, mosaic hay phim. Cờ `CONFIG.teacherInMovie = false` giữ nguyên mặc định này.

---

## 4. Thêm nhạc `song.mp3`

Trang **không có** file nhạc sẵn. Khi chưa có nhạc, cảnh phim vẫn chạy bình thường bằng đồng hồ nội bộ và nhịp tự tạo theo `bpm`; không có thông báo lỗi nào trên giao diện.

Cách thêm (không cần sửa code):

1. Đặt file vào `public/assets/audio/song.mp3` **trước khi** chạy `npm run build`.
2. Nếu đã build xong, chép thẳng file vào `dist/assets/audio/song.mp3` (đúng chữ thường `song.mp3`).
3. Trên GitHub, tải file lên thư mục `public/assets/audio/song.mp3` (hoặc `dist/assets/audio/` nếu bạn deploy nhánh chứa bản build).
4. Đường dẫn trong code là tương đối: `assets/audio/song.mp3`, nên chạy đúng cả khi trang nằm trong thư mục con của GitHub Pages.

Lưu ý: nhạc chỉ bắt đầu sau lần chạm đầu tiên ở màn hình **"Chạm để mở quà"**, đúng chính sách autoplay của trình duyệt. Trang không có nút bật/tắt âm thanh — hãy chỉnh bằng phím âm lượng của thiết bị.

---

## 5. Chỉnh nhịp / độ dài

Mở `src/data/config.ts`:

```ts
song: {
  url: "assets/audio/song.mp3",
  bpm: 100,              // nhịp trái tim đập / hiệu ứng nhấp nháy
  beatOffset: 0,         // lệch phách đầu (giây)
  duration: 59,          // tổng độ dài cảnh phim
  heartDuration: 12.967, // 12.97s cuối: trái tim hạt & vòng chữ
}
```

Mốc thời gian lyric được tính tự động từ dữ liệu SRT trong `src/data/lyrics.ts`; không cần sửa tay. Khi thay file SRT, chỉ cần giữ nguyên định dạng `HH:MM:SS,mmm --> HH:MM:SS,mmm`.

Bản SRT hiện tại (14 mốc, tiếng Việt) có phụ đề từ **2,533s** đến **46,033s**. Cảnh phim bắt đầu bằng **2,5 giây mở màn không chữ, chỉ có nhạc và hiệu ứng nền**, rồi lyric mới xuất hiện. Khi lyric kết thúc, trái tim hạt 3D hiện ra, đập theo nhịp cùng chữ nền và biến mất ở giây thứ **59** (trái tim kéo dài 12,967 giây). Nếu thay SRT dài/ngắn hơn, hãy đặt `duration` bằng mốc cuối + thời gian muốn giữ trái tim, và chỉnh `heartDuration` tương ứng.

---

## 6. Sửa lời chúc / tên các bạn

Tất cả nằm trong `src/data/config.ts`:

- `girls`: danh sách họ tên đầy đủ. Tên gọi và chữ cái avatar được lấy tự động từ từ cuối của tên.
- `messages`: lời chúc hiện trên thẻ lật và trên dải ngân hà (nên giữ mỗi câu ngắn dưới ~70 ký tự để hiển thị đẹp).
- `introLetter`: 5 dòng cho lá thư mở đầu.
- `finalLetter`: các dòng của lá thư kết (kết thúc tự động bằng `— Các bạn nam lớp 11B7 —`).
- `senderName`, `className`, `year`: tên lớp, năm và người gửi.

Sau khi sửa, chạy lại `npm run dev` (hoặc `npm run build`).

---

## 7. Đưa lên GitHub Pages

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

## 8. Tạo QR từ link

1. Copy link GitHub Pages ở bước 6.
2. Dùng một dịch vụ tạo QR miễn phí (ví dụ `qr-code-generator.com`, `me-qr.com`) hoặc chạy:
   `npx qrcode-terminal "https://<tài-khoản>.github.io/<repo>/"`
3. Tải ảnh QR, in kèm lời nhắn "Quét để mở món quà của 11B7 🌸" rồi dán vào thiệp/thiệp lớp.
4. Nhớ kiểm tra QR bằng điện thoại trước khi in hàng loạt.

---

## 9. Ghi chú kỹ thuật

- Toàn bộ hoa, gấu, bướm, bóng bay được vẽ bằng **SVG/CSS 3D**, không cần WebGL, nên trang vẫn đẹp và đủ nội dung trên mọi thiết bị.
- Chuyển động dùng `transform`/`opacity`; hiệu ứng hạt chạy chung một `requestAnimationFrame`; tạm dừng khi tab ẩn.
- Tôn trọng `prefers-reduced-motion`; thiếu API (Fullscreen, Orientation lock, vibrate…) thì bỏ qua êm.
- Ảnh hoa 3D nhiều lớp cánh xếp xoắn ốc, có hiệu ứng nở, nghiêng theo con trỏ, kéo để xoay và chạm để hoa rung.
- Lời chúc luôn hiển thị **một thẻ tại một thời điểm** trong sân khấu riêng, không thể chồng chữ lên nhau hay tràn lên tiêu đề.
- Thẻ tên không còn lật hai mặt. Mỗi thẻ chỉ có một mặt; chạm vào sẽ mở overlay lời chúc, nên không thể xảy ra lỗi “lật rồi biến mất”.
- Chế độ **lite** tự bật khi máy yếu (RAM/CPU thấp) hoặc khi FPS tụt dưới ~42: giảm số hạt (trái tim còn ~1100 hạt), hạ DPR canvas, vẽ 24–28fps, tắt bớt animation trang trí, blur và `backdrop-filter`. Nội dung, lyric và nhịp trái tim vẫn giữ nguyên.
- **Chống ngắt giữa từ:** mọi khối chữ đặt `word-break: normal; overflow-wrap: normal; hyphens: manual`. Các hiệu ứng tách chữ bọc từng TỪ trong span `nowrap`; chữ trong tên/lyric/thiệp chỉ xuống dòng ở dấu cách. Tên dài trên thẻ đã được kiểm tra ở 320/360/390/414px.
- **Âm thanh iOS:** lần chạm “Chạm để mở quà” gọi `unlockSong()` (play rồi pause phần tử audio) và khởi tạo AudioContext; lần chạm tinh cầu gọi `resume()` + `startSong()`. Nếu tải nhạc lỗi, cảnh phim chạy bằng đồng hồ thời gian thực và nhịp tự tạo từ `bpm`.
- **Hiệu ứng âm thanh mới:** `type`, `found`, `envelope`, `letter-tick`, `star`, `plant`, `teacher` — tất cả tổng hợp bằng Web Audio, không có file rời.
- Chú gấu chibi được vẽ mới hoàn toàn bằng SVG: mắt biết chớp, tay vẫy, nơ cổ và cành tulip khẽ đung đưa — nhẹ hơn ảnh raster và sắc nét trên mọi màn hình.
- Không sử dụng `localStorage`/`sessionStorage`.

Chúc các bạn gái 11B7 một ngày 20/10 thật rạng rỡ. 💐
