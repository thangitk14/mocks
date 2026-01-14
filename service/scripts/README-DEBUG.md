# MySQL Connection Debug Scripts

Các script này giúp kiểm tra và debug lỗi kết nối MySQL với các thông tin chi tiết về username, password, database name.

## Scripts

### 1. `debug-mysql-connection.sh` - Debug toàn diện
Script kiểm tra đầy đủ các vấn đề kết nối MySQL.

**Cách chạy:**
```bash
chmod +x service/scripts/debug-mysql-connection.sh
./service/scripts/debug-mysql-connection.sh
```

**Kiểm tra:**
- Environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
- MySQL container status
- Network connectivity
- MySQL users và permissions
- Database existence
- Connection test từ service container

### 2. `check-mysql-credentials.sh` - Kiểm tra credentials
Script nhanh để kiểm tra username, password, database.

**Cách chạy:**
```bash
chmod +x service/scripts/check-mysql-credentials.sh
./service/scripts/check-mysql-credentials.sh
```

**Kiểm tra:**
- Environment variables từ service container
- Test các credentials
- User permissions
- Database existence

### 3. `test-mysql-connection.js` - Test connection từ Node.js
Script Node.js để test kết nối với thông báo lỗi chi tiết.

**Cách chạy:**
```bash
# Từ thư mục service
cd service
node scripts/test-mysql-connection.js

# Hoặc từ service container
docker exec -it mock_service_app node /app/scripts/test-mysql-connection.js
```

## Các lệnh debug nhanh

### 1. Kiểm tra environment variables trong service container
```bash
docker exec mock_service_app printenv | grep DB_
```

### 2. Kiểm tra MySQL users và hosts
```bash
docker exec -i mock_service_mysql mysql -uroot -pTtct@835!! -e "SELECT User, Host FROM mysql.user WHERE User='root';"
```

### 3. Kiểm tra database có tồn tại không
```bash
docker exec -i mock_service_mysql mysql -uroot -pTtct@835!! -e "SHOW DATABASES;"
```

### 4. Test connection từ MySQL container
```bash
docker exec -it mock_service_mysql mysql -uroot -pTtct@835!! -e "SELECT 1;"
```

### 5. Test connection với credentials cụ thể
```bash
docker exec -i mock_service_mysql mysql -uroot -pTtct@835!! -e "SELECT USER(), DATABASE();"
```

### 6. Kiểm tra MySQL container IP
```bash
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mock_service_mysql
```

### 7. Kiểm tra network connectivity
```bash
docker exec mock_service_app ping -c 2 mock_mysql
```

## Fix lỗi "Host is not allowed to connect"

### Cách 1: Chạy lệnh SQL trực tiếp (nhanh nhất)
```bash
docker exec -i mock_service_mysql mysql -uroot -pTtct@835!! <<EOF
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY 'Ttct@835!!';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EOF
```

### Cách 2: Tạo file init.sql (cho lần đầu tạo container)
Tạo file `service/scripts/init.sql`:
```sql
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY 'Ttct@835!!';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

Sau đó xóa volume và tạo lại:
```bash
docker compose down
docker volume rm mocks_mock_mysql_data
docker compose up -d
```

## Kiểm tra logs

### Xem logs của service container
```bash
docker logs mock_service_app
```

### Xem logs của MySQL container
```bash
docker logs mock_service_mysql
```

### Xem logs real-time
```bash
docker logs -f mock_service_app
```



