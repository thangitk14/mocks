# Docker Setup Guide

Hướng dẫn chạy toàn bộ hệ thống với Docker Compose.

## Cấu trúc Services

- **mock_mysql**: MySQL database (port 3306)
- **mock_service**: Backend API service (port 3000)
- **host_forward**: Host forwarding service (port 4000)
- **portal**: React frontend với nginx (port 80)

## Cách sử dụng

### 1. Build và chạy tất cả services

```bash
docker-compose up -d --build
```

### 2. Xem logs

```bash
# Xem logs tất cả services
docker-compose logs -f

# Xem logs một service cụ thể
docker-compose logs -f mock_service
docker-compose logs -f host_forward
docker-compose logs -f portal
```

### 3. Dừng services

```bash
docker-compose down
```

### 4. Dừng và xóa volumes (xóa database)

```bash
docker-compose down -v
```

### 5. Rebuild một service cụ thể

```bash
docker-compose build mock_service
docker-compose up -d mock_service
```

## Environment Variables

### Service (.env.production)
- `NODE_ENV`: production
- `PORT`: 3000
- `DB_HOST`: mock_mysql
- `DB_PORT`: 3306
- `DB_USER`: root
- `DB_PASSWORD`: Test@123
- `DB_NAME`: service_dev
- `JWT_SECRET`: your_jwt_secret_key_for_production
- `JWT_EXPIRES_IN`: 24h
- `CORS_ORIGIN`: *

### Host Forward (.env.production)
- `NODE_ENV`: production
- `PORT`: 4000
- `SERVICE_URL`: http://mock_service:3000

### Portal (.env.production)
- File: `portal/.env.production`
- `VITE_API_BASE_URL`: (Optional) 
  - Để trống hoặc comment: Portal sẽ sử dụng relative paths (khuyến nghị)
  - Nginx sẽ proxy `/api/*` đến `mock_service:3000`
  - Hoặc set external URL nếu backend có domain riêng
- **Lưu ý**: Cấu hình trong file `.env.production`, không cấu hình trong docker-compose.yml

## Production Mode

Tất cả services đã được cấu hình để:
- Listen trên `0.0.0.0` trong production mode (cho phép truy cập từ localhost và external interfaces)
- Sử dụng environment variables từ `.env.production` files

## Nginx Proxy Configuration

Portal sử dụng nginx để proxy API requests:
- Tất cả requests đến `/api/*` sẽ được proxy đến `mock_service:3000`
- Tất cả requests đến `/socket.io/*` sẽ được proxy đến `mock_service:3000` (cho WebSocket)
- Điều này cho phép portal hoạt động với bất kỳ domain nào mà không cần cấu hình CORS

### Deploy với Domain Production

Khi deploy lên domain (ví dụ: `fw.thangvnnc.io.vn`):
1. Portal sẽ tự động detect domain hiện tại
2. API requests sẽ sử dụng relative paths (ví dụ: `/api/auth/login`)
3. Nginx sẽ tự động proxy các requests này đến backend service
4. Không cần cấu hình `VITE_API_BASE_URL` - hệ thống sẽ tự động hoạt động

## Ports

- **3000**: Backend API (mock_service) - Public
- **80**: Host Forward service - Public
- **8910**: Frontend Portal - Public
- **3306**: MySQL Database - Internal only

## Networks

Tất cả services được kết nối qua network `mock_service_network` để có thể giao tiếp với nhau.

## Service Communication (Endpoints)

### Internal Communication (Docker Network)

Các services giao tiếp với nhau qua Docker service names:

- **host_forward** → **mock_service**: `http://mock_service:3000`
  - Lấy mapping domain configuration
  - Kiểm tra mock responses
  - Log API requests

- **mock_service** → **mock_mysql**: `mock_mysql:3306`
  - Database connection

- **portal** → **mock_service**: Qua nginx proxy
  - `/api/*` → `http://mock_service:3000`
  - `/socket.io/*` → `http://mock_service:3000`

### External Access

- **Portal**: `http://your-domain.com` hoặc `http://localhost`
- **Host Forward**: `http://your-domain.com:4000` hoặc `http://localhost:4000`
- **Backend API**: `http://your-domain.com:3000` hoặc `http://localhost:3000` (optional)

Xem chi tiết trong file [ENDPOINTS_CONFIG.md](./ENDPOINTS_CONFIG.md)

## Health Checks

- MySQL: Health check tự động, các services khác sẽ đợi MySQL sẵn sàng
- Service endpoints:
  - `http://localhost:3000/health` - Backend API
  - `http://localhost:4000/health` - Host Forward
  - `http://localhost/health` - Portal

## Environment Variables Configuration

Có thể cấu hình qua:
1. **File .env.production** trong mỗi service directory
2. **Environment variables** trong docker-compose.yml
3. **.env file** ở root (nếu sử dụng docker-compose với env_file)

Xem chi tiết cấu hình endpoints trong [ENDPOINTS_CONFIG.md](./ENDPOINTS_CONFIG.md)

