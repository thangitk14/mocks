# Portal Environment Configuration

## Cấu hình Environment Variables

Portal sử dụng file `.env.production` để cấu hình environment variables khi build.

### File Location
- `portal/.env.production` - File cấu hình cho production build

### Cách hoạt động

1. **Vite tự động load** `.env.production` khi build với `--mode production`
2. **Chỉ các biến có prefix `VITE_*`** mới được embed vào code
3. **Build-time replacement**: Các biến được thay thế vào code khi build, không phải runtime

### Cấu hình VITE_API_BASE_URL

#### Option 1: Để trống (Khuyến nghị cho production)
```bash
# VITE_API_BASE_URL=
```
- Portal sẽ sử dụng relative paths: `/api/auth/login`
- Nginx sẽ tự động proxy đến `mock_service:3000`
- Hoạt động với mọi domain mà không cần cấu hình

#### Option 2: External URL
```bash
VITE_API_BASE_URL=https://api.example.com
```
- Sử dụng khi backend có domain riêng
- Portal sẽ gọi trực tiếp đến external URL

#### Option 3: Localhost (Chỉ cho development)
```bash
VITE_API_BASE_URL=http://localhost:3000
```
- Chỉ dùng khi chạy local development
- Không dùng trong production Docker

### Lưu ý quan trọng

1. **Không set Docker internal URLs**:
   - ❌ `VITE_API_BASE_URL=http://mock_service:3000` - Browser không thể resolve
   - ✅ Để trống để dùng relative paths

2. **File .env.production phải tồn tại**:
   - File được copy vào Docker image khi build
   - Đảm bảo file có trong repository hoặc được tạo trước khi build

3. **Rebuild sau khi thay đổi**:
   ```bash
   docker-compose build portal
   docker-compose up -d portal
   ```

### Ví dụ file .env.production

```bash
# Vite Production Environment Variables
# This file is automatically loaded by Vite when building with --mode production

# API Base URL (optional)
# Leave empty to use relative paths (recommended)
# VITE_API_BASE_URL=

# Or set to external URL
# VITE_API_BASE_URL=https://api.example.com
```

### Kiểm tra cấu hình

Sau khi build, kiểm tra console logs trong browser:
- Nếu thấy: `[API] Production mode - using relative path (empty string)` → Đang dùng relative paths ✅
- Nếu thấy: `[API] Using VITE_API_BASE_URL: ...` → Đang dùng giá trị từ .env.production

