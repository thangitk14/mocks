# Fix: Path Matching với Trailing Slash

## Vấn đề

Khi call forward domain với path có trailing slash (ví dụ: `/vietbank_qa/`), hệ thống không tìm thấy mapping dù đã cấu hình.

**Lỗi:**
```json
{
  "success": false,
  "error": {
    "message": "No mapping found for this path",
    "path": "/vietbank_qa/"
  }
}
```

## Nguyên nhân

Logic path matching cũ không xử lý tốt trailing slash:
- Path trong request: `/vietbank_qa/` (có trailing slash)
- Path trong database: `/vietbank_qa` (không có trailing slash)
- Exact match: `d.path === path` → Fail
- Prefix match: `path.startsWith(d.path)` → Có thể match nhưng không đúng logic

## Giải pháp

### 1. Normalize Path

Thêm function `normalizePath` để chuẩn hóa path:
- Loại bỏ trailing slash (trừ root path `/`)
- `/vietbank_qa/` → `/vietbank_qa`
- `/vietbank_qa` → `/vietbank_qa`
- `/` → `/` (giữ nguyên)

### 2. Cải thiện Matching Logic

**Exact Match:**
- Normalize cả path request và path trong database
- So sánh sau khi normalize

**Prefix Match:**
- Normalize cả hai paths
- Kiểm tra prefix match với validation:
  - Đảm bảo next character là `/` hoặc end of string
  - Tránh substring match (ví dụ: `/vietbank` match với `/vietbank_qa`)

**Wildcard Match:**
- Xử lý cả trailing slash trong wildcard paths
- Ví dụ: `/vietbank/*` match với `/vietbank/` và `/vietbank`

### 3. Debug Logging

Thêm logging để debug:
- Log khi không tìm thấy mapping
- Log available mappings
- Log khi tìm thấy mapping

## Cách kiểm tra

### 1. Kiểm tra mappings đã load

```bash
# Call debug endpoint
curl http://fw.thangvnnc.io.vn/debug/mappings

# Hoặc từ localhost
curl http://localhost/debug/mappings
```

### 2. Test với các paths khác nhau

```bash
# Path với trailing slash
curl http://fw.thangvnnc.io.vn/vietbank_qa/

# Path không có trailing slash
curl http://fw.thangvnnc.io.vn/vietbank_qa

# Path với sub-path
curl http://fw.thangvnnc.io.vn/vietbank_qa/api/test
```

### 3. Xem logs

```bash
docker-compose logs host_forward | grep "\[Config\]"
```

Sẽ thấy:
- `[Config] Found mapping for path: /vietbank_qa/ -> /vietbank_qa`
- Hoặc `[Config] No mapping found for path: ...` với danh sách available mappings

## Test Cases

### Case 1: Exact Match với Trailing Slash
- **Request**: `/vietbank_qa/`
- **Mapping**: `/vietbank_qa`
- **Expected**: ✅ Match

### Case 2: Exact Match không có Trailing Slash
- **Request**: `/vietbank_qa`
- **Mapping**: `/vietbank_qa/`
- **Expected**: ✅ Match

### Case 3: Prefix Match
- **Request**: `/vietbank_qa/api/test`
- **Mapping**: `/vietbank_qa`
- **Expected**: ✅ Match

### Case 4: Wildcard Match
- **Request**: `/vietbank_qa/test`
- **Mapping**: `/vietbank_qa/*`
- **Expected**: ✅ Match

### Case 5: Substring không Match
- **Request**: `/vietbank_qa_test`
- **Mapping**: `/vietbank_qa`
- **Expected**: ❌ Không match (đúng)

## Troubleshooting

### Vẫn không tìm thấy mapping

1. **Kiểm tra config đã load chưa:**
   ```bash
   curl http://fw.thangvnnc.io.vn/debug/mappings
   ```

2. **Kiểm tra state của mapping:**
   - Phải là `state: 'Active'`
   - Không được là `forward_state: 'NoneApi'`

3. **Kiểm tra logs:**
   ```bash
   docker-compose logs host_forward | tail -50
   ```

4. **Kiểm tra SERVICE_URL:**
   ```bash
   docker-compose exec host_forward env | grep SERVICE_URL
   # Phải là: SERVICE_URL=http://fw.thangvnnc.io.vn:3000
   ```

5. **Test API trực tiếp:**
   ```bash
   curl http://fw.thangvnnc.io.vn:3000/api/config/mappingDomain
   ```

### Mapping không được refresh

- Config tự động refresh mỗi 30 giây
- Hoặc restart host_forward để reload:
  ```bash
  docker-compose restart host_forward
  ```

