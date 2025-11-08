# Hướng dẫn Debug Lỗi Login

## Các bước kiểm tra khi gặp lỗi "Error Login failed"

### 1. Kiểm tra Console Logs trong Browser

Mở Developer Tools (F12) và xem Console tab. Bạn sẽ thấy các logs:

- `[API] Initialized with baseURL: ...` - Kiểm tra API URL được sử dụng
- `[Login] Attempting login for user: ...` - Xác nhận login được gọi
- `[API Request] POST /api/auth/login` - Xem request được gửi
- `[API Response]` hoặc `[API Error]` - Xem response từ server

### 2. Kiểm tra Network Tab

Trong Network tab của Developer Tools:
- Tìm request `POST /api/auth/login`
- Kiểm tra:
  - **Status Code**: 200 (success) hoặc 4xx/5xx (error)
  - **Request URL**: Phải là `/api/auth/login` (relative path) hoặc đầy đủ domain
  - **Request Headers**: Kiểm tra `Content-Type: application/json`
  - **Response**: Xem response body để biết lỗi cụ thể

### 3. Kiểm tra Docker Containers

```bash
# Kiểm tra tất cả containers đang chạy
docker-compose ps

# Xem logs của backend service
docker-compose logs mock_service

# Xem logs của portal
docker-compose logs portal

# Xem logs của nginx trong portal
docker-compose exec portal cat /var/log/nginx/error.log
```

### 4. Kiểm tra Nginx Proxy

```bash
# Kiểm tra nginx config
docker-compose exec portal cat /etc/nginx/conf.d/default.conf

# Test nginx config
docker-compose exec portal nginx -t

# Restart nginx
docker-compose exec portal nginx -s reload
```

### 5. Test API trực tiếp

```bash
# Test API từ container
docker-compose exec mock_service curl http://localhost:3000/health

# Test API từ portal container
docker-compose exec portal curl http://mock_service:3000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'
```

### 6. Các lỗi thường gặp

#### Lỗi: "Network error: Cannot connect to server"
- **Nguyên nhân**: Nginx không proxy được đến backend
- **Giải pháp**: 
  - Kiểm tra `mock_service` container có đang chạy không
  - Kiểm tra network `mock_service_network`
  - Kiểm tra nginx config

#### Lỗi: "Invalid credentials"
- **Nguyên nhân**: Username/password sai hoặc user không active
- **Giải pháp**: Kiểm tra database, đảm bảo user tồn tại và active

#### Lỗi: "No token received from server"
- **Nguyên nhân**: Response từ server không có token
- **Giải pháp**: Kiểm tra backend logs, có thể lỗi trong quá trình generate token

#### Lỗi: CORS errors
- **Nguyên nhân**: CORS không được cấu hình đúng
- **Giải pháp**: Đã được xử lý bằng nginx proxy, không cần CORS nữa

### 7. Rebuild và Restart

Nếu vẫn không hoạt động, thử rebuild:

```bash
# Rebuild portal
docker-compose build portal
docker-compose up -d portal

# Hoặc rebuild tất cả
docker-compose down
docker-compose up -d --build
```

### 8. Kiểm tra Environment Variables

```bash
# Kiểm tra env của portal
docker-compose exec portal env | grep VITE

# Kiểm tra env của service
docker-compose exec mock_service env | grep NODE_ENV
```

## Thông tin cần cung cấp khi báo lỗi

Khi báo lỗi, vui lòng cung cấp:
1. Console logs từ browser
2. Network request/response từ browser
3. Docker logs từ `mock_service` và `portal`
4. Screenshot của error message
5. Domain đang sử dụng (localhost hay domain production)

