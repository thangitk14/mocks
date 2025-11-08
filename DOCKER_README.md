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
- `VITE_API_BASE_URL`: http://localhost:3000

## Production Mode

Tất cả services đã được cấu hình để:
- Listen trên `0.0.0.0` trong production mode (cho phép truy cập từ localhost và external interfaces)
- Sử dụng environment variables từ `.env.production` files

## Ports

- **3000**: Backend API (mock_service)
- **4000**: Host Forward service
- **80**: Frontend Portal
- **3306**: MySQL Database

## Networks

Tất cả services được kết nối qua network `mock_service_network` để có thể giao tiếp với nhau.

## Health Checks

- MySQL: Health check tự động, các services khác sẽ đợi MySQL sẵn sàng
- Service endpoints:
  - `http://localhost:3000/health` - Backend API
  - `http://localhost:4000/health` - Host Forward
  - `http://localhost/health` - Portal

