# Quick Start Guide - Docker Desktop

Hướng dẫn nhanh để chạy service với Docker Desktop

## Bước 1: Kiểm tra Docker Desktop

Đảm bảo Docker Desktop đang chạy:

```bash
docker --version
docker-compose --version
```

Nếu chưa cài Docker Desktop, tải tại: https://www.docker.com/products/docker-desktop

## Bước 2: Chạy Service

```bash
cd service
docker-compose up
```

Chờ khoảng 1-2 phút cho lần chạy đầu tiên.

Bạn sẽ thấy:
```
service_mysql  | ... MySQL init process done. Ready for start up.
service_app    | Server is running on port 3000
service_app    | Database connected successfully
```

## Bước 3: Test API

Mở terminal mới, test health check:

```bash
curl http://localhost:3000/health
```

Kết quả:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-11-08T..."
}
```

## Bước 4: Test Login với Admin

Database đã tạo sẵn một admin user:
- Username: `admin`
- Password: `Test@123`

### Login với admin:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Test@123"
  }'
```

Kết quả:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "System Administrator",
      "username": "admin",
      "role_user_id": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Register user mới:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nguyen Van A",
    "username": "nguyenvana",
    "password": "password123"
  }'
```

Kết quả:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Nguyen Van A",
      "username": "nguyenvana",
      "role_user_id": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nguyenvana",
    "password": "password123"
  }'
```

### Get Profile (cần token):

```bash
# Thay <YOUR_TOKEN> bằng token nhận được từ login
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

## Bước 5: Kiểm tra Database

### Kết nối MySQL từ host:

Dùng MySQL Workbench, DBeaver, hoặc CLI:

```bash
mysql -h 127.0.0.1 -P 3306 -u root -p
# Password: Test@123
```

Hoặc truy cập từ Docker:

```bash
docker exec -it service_mysql mysql -uroot -pTest@123 service_dev
```

### Kiểm tra default roles:

```sql
USE service_dev;
SELECT * FROM roles;
```

Kết quả:
```
+----+----------------+-------------------------+-----------+
| id | code           | name                    | path      |
+----+----------------+-------------------------+-----------+
|  1 | ADMIN          | Administrator           | /*        |
|  2 | CONFIG_MANAGER | Configuration Manager   | /config/* |
|  3 | USER_MANAGER   | User Manager            | /users/*  |
|  4 | VIEWER         | Viewer                  | /view/*   |
+----+----------------+-------------------------+-----------+
```

## Quản lý Docker

### Xem logs:
```bash
docker-compose logs -f
```

### Dừng services:
```bash
# Ctrl+C nếu đang chạy foreground
# Hoặc
docker-compose down
```

### Chạy background:
```bash
docker-compose up -d
```

### Restart:
```bash
docker-compose restart
```

### Xem containers đang chạy:
```bash
docker-compose ps
```

## Troubleshooting

### Port 3000 hoặc 3306 đã được dùng?

Kiểm tra:
```bash
# macOS/Linux
lsof -i :3000
lsof -i :3306

# Dừng process hoặc thay đổi port trong docker-compose.yml
```

### MySQL không start?

```bash
# Xóa volume và restart
docker-compose down -v
docker-compose up
```

### Rebuild lại image:

```bash
docker-compose build --no-cache
docker-compose up
```

## Development Tips

### Hot Reload

Code thay đổi trong folder `src/` sẽ tự động reload nhờ nodemon.

Thử sửa file `src/index.js` và xem logs!

### Xem logs realtime:

```bash
# Tất cả services
docker-compose logs -f

# Chỉ service
docker-compose logs -f service

# Chỉ MySQL
docker-compose logs -f mysql
```

### Truy cập vào container:

```bash
# Vào service container
docker exec -it service_app sh

# Check env variables
docker exec -it service_app env

# Chạy npm commands
docker exec -it service_app npm run dev
```

## Xong!

Service của bạn đã chạy:
- API: http://localhost:3000
- MySQL: localhost:3306
- Database: service_dev
- Credentials: root/Test@123

Xem thêm:
- [README.md](README.md) - Chi tiết về API và features
- [DOCKER.md](DOCKER.md) - Hướng dẫn Docker đầy đủ
