# PROJECT CONTEXT - Online Exam Platform

## Thông tin hệ thống
- **Tên dự án:** Luyện Đề Online (Online Exam Platform)
- **Ngôn ngữ:** Node.js + Express + MongoDB
- **Database:** MongoDB Atlas (cloud)
- **Deployment:** VPS (server từ xa)
- **Process Manager:** PM2
- **Repository:** https://github.com/thagtronxoe/luyende-online.git

## Cấu trúc dự án
```
online-exam-platform/
├── server.js           # Backend API server
├── admin.js            # Admin panel logic
├── script.js           # Student exam interface logic
├── api.js              # API client functions
├── index.html          # Student interface (KaTeX rendering)
├── admin.html          # Admin panel (MathJax rendering)
├── styles.css          # Student styles
├── admin.css           # Admin styles
├── .env                # Environment variables (MONGODB_URI, JWT_SECRET)
└── package.json        # Dependencies
```

## Thông tin quan trọng

### Database
- **Type:** MongoDB Atlas (cloud database)
- **Connection:** Qua biến môi trường `MONGODB_URI` trong `.env`
- **Collections chính:**
  - `users` - Học sinh
  - `exams` - Đề thi
  - `packages` - Gói đề
  - `admins` - Quản trị viên
  - `history` - Lịch sử làm bài

### Deployment trên VPS
- Server chạy trên VPS (không phải localhost)
- Sử dụng PM2 để quản lý process
- Khi cập nhật code:
  ```bash
  ssh vps
  cd /path/to/project
  git pull origin main
  pm2 restart all
  ```

### LaTeX Rendering
- **Student side (index.html):** Dùng **KaTeX** (fast, client-side)
- **Admin side (admin.html):** Dùng **MathJax** (WYSIWYG editor)
- **Delimiters:** `$...$` (inline), `$$...$$` (display)

## Exam Templates
- **THPT Toán:** 12 MC + 4 TF + 6 Fill = 22 câu
- **KHTN/KHXH:** 18 MC + 4 TF + 6 Fill = 28 câu

## Lịch sử sửa lỗi quan trọng

### 1. Package Activation Persistence (2025-12-22)
- **Vấn đề:** Free registration không lưu vào backend
- **Fix:** Tạo API `/api/packages/:id/activate` trong `server.js`

### 2. KHTN Exam Structure (2025-12-22)
- **Vấn đề:** KHTN hiển thị sai số câu (12 thay vì 18)
- **Fix:** Dynamic section ranges trong `generateQuestionGrid()`

### 3. LaTeX Rendering Issues (2025-12-22)
- **Vấn đề:** Raw LaTeX code hiển thị, font xấu
- **Fix 1:** Font revert về Serif (user preference)
- **Fix 2:** `formatMathContent` xử lý `$` delimiter
- **Fix 3:** Type checking cho numeric inputs (crash fix)

### 4. Exam Resume State Reset (2025-12-22)
- **Vấn đề:** Reload trang → mất đáp án + thời gian reset
- **Fix:** `startExam(isResume)` flag để không reset state

### 5. Admin Panel Answer Reset (2025-12-22)
- **Vấn đề:** Sửa đề → dropdown "Đáp án đúng" reset về A
- **Fix:** `isOptionSelected()` helper với trim + robust comparison

## Lưu ý khi làm việc

### Khi sửa code
1. **Luôn test trên local trước**
2. **Commit với message rõ ràng**
3. **Push lên Git**
4. **SSH vào VPS → git pull → pm2 restart**

### Khi gặp lỗi database
- Dữ liệu lưu trên MongoDB Atlas (cloud)
- Không có backup tự động → cần thiết lập backup schedule
- Nếu mất dữ liệu → khó khôi phục trừ khi có backup

### Khi cần rollback
```bash
# Xem lịch sử
git log --oneline -20

# Checkout về commit cũ
git checkout <commit-hash>
pm2 restart all

# Quay lại main
git checkout main
pm2 restart all
```

## Các commit quan trọng
- `725c4d9` - Trước khi fix LaTeX (bản ổn định cuối)
- `a41e6c5` - Fix LaTeX rendering (có thể gây vấn đề)
- `c21f223` - Fix admin panel answer reset (mới nhất)

## Checklist khi deploy
- [ ] Pull code mới: `git pull origin main`
- [ ] Install dependencies: `npm install` (nếu có thay đổi package.json)
- [ ] Check .env file (MONGODB_URI, JWT_SECRET)
- [ ] Restart server: `pm2 restart all`
- [ ] Test admin panel: Tạo/Sửa đề
- [ ] Test student side: Làm bài, submit, review

## Contact & Support
- User: HP (thagtronxoe)
- GitHub: https://github.com/thagtronxoe/luyende-online
- Conversation ID: 798a1afe-1948-43b5-969c-1cbfca4cfd42
