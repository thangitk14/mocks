# Docker Setup Guide

Hướng dẫn chạy service với Docker Desktop (MySQL + Node.js Service)

## Yêu cầu

- Docker Desktop đã được cài đặt và đang chạy
- Port 3000 (service) và 3306 (MySQL) chưa được sử dụng

## Kiến trúc Docker

Dự án sử dụng Docker Compose với 2 services:

1. **mysql**: MySQL 8.0 database
   - Port: 3306
   - Database: service_dev
   - Credentials: root/Test@123
   - Volume: mysql_data (persistent storage)

2. **service**: Node.js application
   - Port: 3000
   - Kết nối với MySQL container
   - Hot reload với nodemon (development mode)

## Cách chạy

### 1. Khởi động tất cả services (khuyến nghị)

```bash
cd service
docker-compose up
```

Hoặc chạy ở background:
```bash
docker-compose up -d
```

**Chú ý:** Lần đầu tiên chạy sẽ mất vài phút để:
- Download MySQL image
- Build Node.js service image
- Khởi tạo database với schema và default roles

### 2. Kiểm tra logs

```bash
# Xem logs tất cả services
docker-compose logs -f

# Xem logs của service cụ thể
docker-compose logs -f service
docker-compose logs -f mysql
```

### 3. Kiểm tra service đang chạy

```bash
# Kiểm tra containers
docker-compose ps

# Test API
curl http://localhost:3000/health
```

Kết quả mong đợi:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-11-08T..."
}
```

## Các lệnh Docker hữu ích

### Quản lý containers

```bash
# Dừng tất cả services
docker-compose down

# Dừng và xóa volumes (XÓA DỮ LIỆU!)
docker-compose down -v

# Restart services
docker-compose restart

# Restart service cụ thể
docker-compose restart service
```

### Rebuild images

```bash
# Rebuild khi có thay đổi Dockerfile hoặc dependencies
docker-compose build

# Rebuild và restart
docker-compose up --build
```

### Truy cập vào containers

```bash
# Truy cập service container
docker exec -it service_app sh

# Truy cập MySQL container
docker exec -it service_mysql bash

# Kết nối MySQL CLI
docker exec -it service_mysql mysql -uroot -pTest@123 service_dev
```

## Development Workflow

### Hot Reload

Service đã được cấu hình với volume mapping:
```yaml
volumes:
  - ./src:/app/src
```

Mọi thay đổi trong folder `src/` sẽ tự động reload nhờ nodemon.

### Cài đặt package mới

**Cách 1: Rebuild container (khuyến nghị)**
```bash
# Thêm package vào package.json
npm install <package-name>

# Rebuild service
docker-compose build service
docker-compose up -d service
```

**Cách 2: Cài trong container**
```bash
docker exec -it service_app npm install <package-name>
docker-compose restart service
```

### Chạy scripts

```bash
# Chạy migration/script trong container
docker exec -it service_app node scripts/initDatabase.js
```

## Troubleshooting

### Port đã được sử dụng

Nếu báo lỗi port 3000 hoặc 3306 đã được sử dụng:

```bash
# Kiểm tra process đang dùng port
# macOS/Linux:
lsof -i :3000
lsof -i :3306

# Windows:
netstat -ano | findstr :3000
netstat -ano | findstr :3306

# Hoặc thay đổi port trong docker-compose.yml
```

### MySQL không khởi động

```bash
# Xem logs
docker-compose logs mysql

# Xóa volume và restart
docker-compose down -v
docker-compose up
```

### Service không kết nối được MySQL

Kiểm tra:
1. MySQL đã healthy chưa: `docker-compose ps`
2. Health check trong docker-compose.yml
3. Credentials trong docker-compose.yml khớp với .env.developer

```bash
# Test kết nối MySQL từ service container
docker exec -it service_app ping mysql
```

### Rebuild toàn bộ

Nếu gặp vấn đề, thử rebuild hoàn toàn:

```bash
# Dừng và xóa tất cả
docker-compose down -v

# Xóa images
docker-compose rm -f
docker rmi service_service

# Rebuild và chạy lại
docker-compose build --no-cache
docker-compose up
```

## Database Management

### Backup database

```bash
docker exec service_mysql mysqldump -uroot -pTest@123 service_dev > backup.sql
```

### Restore database

```bash
docker exec -i service_mysql mysql -uroot -pTest@123 service_dev < backup.sql
```

### Truy cập MySQL từ host

Bạn có thể kết nối MySQL từ máy host (MySQL Workbench, DBeaver, etc.):

- Host: `localhost`
- Port: `3306`
- User: `root`
- Password: `Test@123`
- Database: `service_dev`

## Production Deployment

Để chạy production mode:

1. Cập nhật docker-compose.yml:
```yaml
environment:
  NODE_ENV: production
```

2. Hoặc tạo file docker-compose.prod.yml riêng

3. Chạy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring

### Kiểm tra resource usage

```bash
# Xem CPU, Memory usage
docker stats

# Chỉ xem service containers
docker stats service_app service_mysql
```

### Cleanup

```bash
# Xóa unused images, containers
docker system prune

# Xóa tất cả (cẩn thận!)
docker system prune -a --volumes
```

## API Testing với Docker

Sau khi services chạy, test các API:

```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "username": "testuser",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

## Cấu trúc Files Docker

```
service/
├── Dockerfile              # Node.js service image definition
├── .dockerignore          # Files to ignore when building
├── docker-compose.yml     # Multi-container orchestration
└── scripts/
    └── init.sql           # MySQL initialization script
```

## Best Practices

1. **Development**: Luôn dùng `docker-compose up` để thấy logs real-time
2. **Production**: Dùng `docker-compose up -d` để chạy background
3. **Backup**: Thường xuyên backup MySQL data
4. **Clean up**: Định kỳ chạy `docker system prune` để giải phóng disk
5. **Volumes**: Không xóa volumes nếu muốn giữ data (`docker-compose down` thay vì `docker-compose down -v`)
