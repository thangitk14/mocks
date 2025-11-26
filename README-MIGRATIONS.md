# Database Migrations Guide

## Chạy Migrations trên Docker Compose

### Cách 1: Sử dụng script helper (Khuyến nghị)

```bash
# Chạy tất cả migrations
./service/scripts/run-migrations-docker.sh

# Chạy migration riêng lẻ
./service/scripts/run-migrations-docker.sh disable-state
./service/scripts/run-migrations-docker.sh domain-id
```

**Lưu ý:** Cần cấp quyền execute cho script:
```bash
chmod +x service/scripts/run-migrations-docker.sh
```

### Cách 2: Chạy trực tiếp trong container

```bash
# Chạy tất cả migrations
docker exec -it mock_service_app npm run migrate

# Chạy migration riêng lẻ
docker exec -it mock_service_app npm run migrate:disable-state
docker exec -it mock_service_app npm run migrate:domain-id

# Hoặc chạy trực tiếp bằng node
docker exec -it mock_service_app node scripts/run-migrations.js
docker exec -it mock_service_app node scripts/migrate-add-disable-state.js
docker exec -it mock_service_app node scripts/migrate-add-domain-id-to-mock-groups.js
```

### Cách 3: Tạo service riêng trong docker-compose (Tùy chọn)

Có thể thêm service migration vào `docker-compose.yml`:

```yaml
  mock_service_migrate:
    build:
      context: ./service
      dockerfile: Dockerfile
    container_name: mock_service_migrate
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      DB_HOST: ${DB_HOST:-mock_mysql}
      DB_PORT: ${DB_PORT:-3306}
      DB_USER: ${DB_USER:-root}
      DB_PASSWORD: ${DB_PASSWORD:-Test@123}
      DB_NAME: ${DB_NAME:-service_dev}
    depends_on:
      mock_mysql:
        condition: service_healthy
    volumes:
      - ./service/scripts:/app/scripts
      - ./service/package.json:/app/package.json
    networks:
      - mock_service_network
    command: npm run migrate
    profiles:
      - migrate
```

Sau đó chạy:
```bash
docker compose --profile migrate up mock_service_migrate
```

## Migrations Available

1. **migrate-add-disable-state.js**
   - Thêm state 'Disable' vào ENUM của `mock_responses.state`
   - Chạy: `npm run migrate:disable-state`

2. **migrate-add-domain-id-to-mock-groups.js**
   - Thêm `domain_id` column vào `mock_groups` table
   - Thêm index và foreign key constraint
   - Chạy: `npm run migrate:domain-id`

## Kiểm tra Migration Status

Để kiểm tra xem migration đã chạy chưa, có thể kiểm tra database:

```bash
# Kiểm tra column domain_id trong mock_groups
docker exec -it mock_service_mysql mysql -uroot -p${DB_PASSWORD:-Test@123} ${DB_NAME:-service_dev} -e "DESCRIBE mock_groups;"

# Kiểm tra ENUM values của mock_responses.state
docker exec -it mock_service_mysql mysql -uroot -p${DB_PASSWORD:-Test@123} ${DB_NAME:-service_dev} -e "SHOW COLUMNS FROM mock_responses LIKE 'state';"
```

## Troubleshooting

### Container không chạy
```bash
# Kiểm tra container status
docker ps -a | grep mock_service

# Khởi động container
docker compose up -d mock_service

# Xem logs
docker logs mock_service_app
```

### Migration bị lỗi
- Kiểm tra logs: `docker logs mock_service_app`
- Kiểm tra database connection: Đảm bảo `mock_mysql` đang chạy
- Kiểm tra environment variables: Đảm bảo DB credentials đúng

### Migration đã chạy nhưng muốn chạy lại
- Các migration scripts đã có kiểm tra, sẽ không chạy lại nếu đã tồn tại
- Nếu cần force, có thể sửa script để bỏ qua kiểm tra (không khuyến nghị)

