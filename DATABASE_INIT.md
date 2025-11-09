# Database Initialization Guide

## Tổng quan

Database được khởi tạo tự động khi MySQL container start lần đầu tiên thông qua file `service/scripts/init.sql`.

## Cấu trúc Script

### File: `service/scripts/init.sql`

File này chứa toàn bộ logic khởi tạo database:
- ✅ Tạo tất cả tables
- ✅ Tạo indexes
- ✅ Tạo foreign keys
- ✅ Migration: Thêm các columns nếu thiếu (duration, response_headers, response_body, name)
- ✅ Insert dữ liệu mặc định (roles, admin user)

**Không cần chạy migration riêng** - tất cả đã được gộp vào init.sql.

## Tables được tạo

1. **users** - Quản lý users
2. **roles** - Quản lý roles
3. **role_user** - Junction table cho many-to-many relationship
4. **mapping_domains** - Quản lý domain mappings
5. **api_logs** - Logs các API requests
6. **mock_responses** - Quản lý mock responses

## Dữ liệu mặc định

### Roles
- `ADMIN` - Full access (path: `/*`)
- `CONFIG_MANAGER` - Configuration access (path: `/config/*`)
- `USER_MANAGER` - User management access (path: `/users/*`)
- `VIEWER` - View access (path: `/view/*`)

### Admin User
- **Username**: `admin`
- **Password**: `Test@123`
- **State**: `Active`
- **Roles**: `ADMIN` (full access)

## Cách hoạt động

### 1. Tự động khi start MySQL lần đầu

MySQL container tự động chạy các file trong `/docker-entrypoint-initdb.d/` khi database chưa được khởi tạo.

```yaml
volumes:
  - ./service/scripts/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
```

### 2. Migration tự động

Script tự động kiểm tra và thêm các columns nếu thiếu:
- `api_logs.duration`
- `api_logs.response_headers`
- `api_logs.response_body`
- `mock_responses.name`

**Không cần chạy migration thủ công** - script tự động xử lý.

## Rebuild Database từ đầu

### Cách 1: Sử dụng script (Khuyến nghị)

```bash
./rebuild-database.sh
```

Script sẽ:
1. Stop các services phụ thuộc
2. Xóa MySQL volume
3. Start MySQL container (tự động chạy init.sql)
4. Verify database đã được khởi tạo đúng

### Cách 2: Manual

```bash
# 1. Stop services
docker-compose stop mock_service host_forward

# 2. Remove MySQL volume
docker-compose down -v mock_mysql

# 3. Start MySQL (tự động chạy init.sql)
docker-compose up -d mock_mysql

# 4. Wait for initialization
sleep 10

# 5. Verify
docker-compose exec mock_mysql mysql -u root -pTest@123 service_dev -e "SHOW TABLES;"
```

### Cách 3: Xóa volume và rebuild

```bash
# Xóa tất cả volumes
docker-compose down -v

# Rebuild và start
docker-compose up -d
```

## Verify Database

### Kiểm tra tables

```bash
docker-compose exec mock_mysql mysql -u root -pTest@123 service_dev -e "SHOW TABLES;"
```

### Kiểm tra admin user

```bash
docker-compose exec mock_mysql mysql -u root -pTest@123 service_dev -e "SELECT id, username, state FROM users WHERE username='admin';"
```

### Kiểm tra roles

```bash
docker-compose exec mock_mysql mysql -u root -pTest@123 service_dev -e "SELECT code, name FROM roles;"
```

### Kiểm tra columns

```bash
# Check api_logs columns
docker-compose exec mock_mysql mysql -u root -pTest@123 service_dev -e "DESCRIBE api_logs;"

# Check mock_responses columns
docker-compose exec mock_mysql mysql -u root -pTest@123 service_dev -e "DESCRIBE mock_responses;"
```

## Troubleshooting

### Database không được khởi tạo

1. **Kiểm tra logs:**
   ```bash
   docker-compose logs mock_mysql | tail -50
   ```

2. **Kiểm tra file init.sql có được mount đúng:**
   ```bash
   docker-compose exec mock_mysql ls -la /docker-entrypoint-initdb.d/
   ```

3. **Kiểm tra MySQL đã chạy:**
   ```bash
   docker-compose ps mock_mysql
   ```

### Migration không chạy

- Script tự động kiểm tra và thêm columns nếu thiếu
- Nếu vẫn thiếu, có thể chạy thủ công:
  ```sql
  ALTER TABLE api_logs ADD COLUMN duration INT NULL AFTER response_body;
  ALTER TABLE api_logs ADD COLUMN response_headers TEXT AFTER toCUrl;
  ALTER TABLE api_logs ADD COLUMN response_body TEXT AFTER response_headers;
  ALTER TABLE mock_responses ADD COLUMN name VARCHAR(500) AFTER id;
  ```

### Admin user không login được

1. **Kiểm tra password hash:**
   ```bash
   docker-compose exec mock_mysql mysql -u root -pTest@123 service_dev -e "SELECT username, password FROM users WHERE username='admin';"
   ```

2. **Reset password (nếu cần):**
   - Sử dụng `initDatabase.js` để tạo password hash mới
   - Hoặc update trực tiếp trong database

## Lưu ý

1. **init.sql chỉ chạy khi database chưa được khởi tạo**
   - Nếu database đã tồn tại, init.sql sẽ không chạy
   - Để rebuild, cần xóa volume: `docker-compose down -v`

2. **Migration tự động**
   - Script tự động kiểm tra và thêm columns nếu thiếu
   - Không cần chạy migration riêng

3. **INSERT IGNORE**
   - Sử dụng `INSERT IGNORE` để tránh duplicate errors
   - Có thể chạy lại script mà không bị lỗi

4. **Backup trước khi rebuild**
   ```bash
   # Export database
   docker-compose exec mock_mysql mysqldump -u root -pTest@123 service_dev > backup.sql
   ```

## Files

- `service/scripts/init.sql` - Complete initialization script
- `rebuild-database.sh` - Script để rebuild database từ đầu
- `service/scripts/initDatabase.js` - Node.js script (optional, không cần thiết nữa)

