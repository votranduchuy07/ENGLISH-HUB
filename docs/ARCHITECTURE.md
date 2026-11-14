# ENGLISH HUB — Phân tích & Kiến trúc

## 1. Kiến trúc tổng thể

```
┌──────────────────────── UI (React + Tailwind + Framer Motion) ────────────────────────┐
│  features/*  (11 phân hệ: mỗi phân hệ có Page + component riêng, bố cục riêng)        │
│  components/ (ui primitives · layout · vocab · charts · illustrations)                 │
└───────────────▲───────────────────────────────────────────────▲───────────────────────┘
                │ hooks / selectors                              │ actions
┌───────────────┴──────────── STATE (Zustand store) ─────────────┴───────────────────────┐
│  useHub: settings · userWords(SRS) · reviewLogs · spellingAttempts · quizResults ·      │
│          mistakes · sessions · personalWords · importedWords · enrichments              │
└───────────────▲───────────────────────────────────────────────────────────────────────┘
                │ StorageAdapter (interface)
┌───────────────┴─────────────┐        ┌──────────────────── DOMAIN (thuần TypeScript) ─┐
│ services/storage            │        │ srs.ts (SM-2 4 mức) · spelling.ts (diff ký tự,   │
│  ├ localAdapter (v1)        │        │ sinh lỗi) · quiz.ts (9 dạng) · recommend.ts      │
│  └ supabaseAdapter (v2 →    │        │ (cá nhân hóa) · analytics.ts · dates.ts          │
│    bảng trong supabase/)    │        └──────────────────────────────────────────────────┘
├─────────────────────────────┤        ┌──────────────────── DATA ───────────────────────┐
│ services/speech (Web Speech)│        │ data/vocabulary.ts (seed biên soạn, gắn nhãn     │
│ services/dictionaryApi      │        │ nguồn & trạng thái xác minh) · quotes · passages │
│ services/importExport (zod) │        │ · confusables · topics                           │
└─────────────────────────────┘        └──────────────────────────────────────────────────┘
```

Nguyên tắc:
- **Domain không phụ thuộc React.** Toàn bộ thuật toán (SRS, chấm chính tả, sinh câu hỏi, gợi ý, thống kê) là hàm thuần, dễ test và dễ dùng lại phía server.
- **Store là nguồn sự thật duy nhất.** Mọi biểu đồ và số liệu đều tính từ log thật trong store, không có số liệu trang trí.
- **Storage có thể thay thế.** v1 lưu LocalStorage (có version + migrate). Khi lên Supabase chỉ cần cài đặt `supabaseAdapter` ánh xạ sang các bảng trong `supabase/schema.sql`.

## 2. Dữ liệu từ vựng & xác minh CEFR

- Mỗi từ có `source.cefr ∈ { verified, suggested, user }` và `source.content ∈ { curated, dictionaryapi, import, user }`.
- **Seed hiện tại** gồm 120 mục do nhóm phát triển tự biên soạn: nghĩa, định nghĩa, ví dụ là văn bản gốc. Cấp CEFR được gắn nhãn **`suggested`** (đề xuất, tham chiếu Oxford 3000/5000 và English Vocabulary Profile, *chưa xác minh*). UI luôn hiển thị rõ nhãn này.
- **Nhập dữ liệu (CSV/JSON)** được kiểm tra bằng schema zod, có xem trước, phát hiện trùng lặp. Chỉ khi file có cột `cefr_source` (ví dụ `Oxford 5000`) và người dùng xác nhận thì mới gắn `verified`.
- **Dictionary API** (dictionaryapi.dev, nội dung từ Wiktionary, giấy phép CC BY-SA): chỉ dùng để *bổ sung* IPA, audio, định nghĩa, từ đồng nghĩa. Phần bổ sung được lưu riêng (`enrichments`) với nhãn nguồn, không ghi đè dữ liệu gốc, và không bao giờ tự gán CEFR.
- Không sinh từ vựng tự động. Kho chỉ mở rộng qua import có kiểm chứng hoặc người dùng tự thêm.

## 3. Công nghệ

| Lớp | Công nghệ |
|---|---|
| Build | Vite 8, TypeScript 7 |
| UI | React 19, Tailwind CSS 4, Framer Motion, Lucide icons |
| Biểu đồ | Recharts + Calendar Heatmap tự vẽ bằng SVG |
| State | Zustand (persist) |
| Kiểm tra dữ liệu | Zod |
| Định tuyến | React Router 7 |
| Âm thanh | Web Speech API (en-GB / en-US), audio từ Dictionary API nếu có |
| Font | Playfair Display, Cormorant Garamond, Inter, IBM Plex Mono (bundle cục bộ qua @fontsource) |
| Backend (v2) | Supabase: PostgreSQL + Auth + RLS |

## 4. Thiết kế database (Supabase)

Xem `supabase/schema.sql`. Các bảng:

- `users` (hồ sơ, 1–1 với `auth.users`) · `user_settings` (1–1) · `daily_goals` (lịch sử mục tiêu)
- `vocabulary_categories` · `vocabulary` (kho dùng chung; `owner_id` NULL = kho hệ thống, có giá trị = từ người dùng tự thêm) · `vocabulary_category_links` (n–n)
- `user_vocabulary` (trạng thái SRS theo từng người × từ; khóa chính `(user_id, vocabulary_id)` nên không trùng lặp)
- `flashcard_reviews` · `spelling_attempts` · `quizzes` · `quiz_results` · `learning_sessions` · `mistakes`

Bật RLS trên mọi bảng: mỗi người chỉ đọc/ghi dữ liệu có `user_id = auth.uid()`. Kho từ hệ thống chỉ đọc. Frontend chỉ dùng anon key (công khai theo thiết kế); service key không bao giờ nằm trong mã frontend.

## 5. Danh sách component

- **layout/**: `AppShell`, `Sidebar` (thanh gáy sách tối), `MobileNav`, `PageHeader` (số Nº kiểu tạp chí)
- **ui/**: `Button`, `IconButton`, `Badge`, `CefrBadge`, `ProgressBar`, `RingProgress`, `Modal`, `Skeleton`, `EmptyState`, `ErrorState`, `Toast`, `Segmented`, `Field`, `Ornament`, `Stat`
- **vocab/**: `PronounceButtons` (UK/US), `Ipa`, `WordEntry` (mục từ từ điển), `VerificationTag`
- **charts/**: `CalendarHeatmap`, `ChartFrame`, chart theme
- **illustrations/**: sách, bút máy, đèn bàn, máy hát, con dấu ex-libris (SVG)
- **features/**: dashboard · library (+ chi tiết từ, import/export) · spelling · flashcards · daily · listening · quizzes · dictionary · mistakes · analytics · settings

## 6. Lộ trình

1. **Foundation**: dự án, design system, shell và điều hướng, Dashboard, Library, dữ liệu seed ✔ (v1)
2. **Learning core**: Spelling (5 chế độ), Flashcards, Daily Learning, Quiz (9 dạng), Mistake Notebook ✔ (v1)
3. **Smart learning**: SRS SM-2, lịch ôn tập, cá nhân hóa, mục tiêu ngày ✔ (v1)
4. **Advanced**: Listening ✔, Analytics ✔, Dictionary API ✔ (bổ sung theo yêu cầu), import kho có kiểm chứng ✔, đồng bộ Supabase (v2: schema sẵn sàng, chờ cài adapter + Auth)
5. **Optimization**: kiểm thử, responsive, hiệu năng, a11y
