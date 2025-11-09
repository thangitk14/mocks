# Host Forward Internal Service Configuration

## Tổng quan

Host Forward được cấu hình để gọi Backend Service qua **Docker internal network** sử dụng service name `mock_service:3000` thay vì public domain.

## Cấu hình

### 1. Docker Compose (`docker-compose.yml`)

```yaml
host_forward:
  environment:
    SERVICE_URL: ${SERVICE_URL:-http://mock_service:3000}
```

**Giải thích:**
- `mock_service` là Docker service name của backend service
- Port `3000` là internal port của service
- Sử dụng Docker internal network `mock_service_network`

### 2. Environment File (`host_forward/.env.production`)

```bash
NODE_ENV=production
PORT=4000
SERVICE_URL=http://mock_service:3000
```

## Lợi ích

### 1. **Performance**
- Giao tiếp trực tiếp qua Docker internal network
- Không cần đi qua public network
- Latency thấp hơn

### 2. **Security**
- Không expose service ra ngoài
- Chỉ accessible từ Docker network
- Giảm attack surface

### 3. **Reliability**
- Không phụ thuộc vào DNS resolution
- Không bị ảnh hưởng bởi network issues
- Luôn available trong cùng Docker network

## Cách hoạt động

### Docker Network

Tất cả services trong cùng network `mock_service_network`:

```yaml
networks:
  mock_service_network:
    driver: bridge
```

Services:
- `mock_mysql` - MySQL database
- `mock_service` - Backend API (port 3000)
- `host_forward` - Host Forward service (port 4000)
- `portal` - Portal frontend

### Internal Communication

```
host_forward → http://mock_service:3000
              ↓
         (Docker Internal Network)
              ↓
         mock_service:3000
```

**Không đi qua:**
- Public IP
- Domain DNS
- External network

## API Calls từ Host Forward

Host Forward gọi các API sau qua `mock_service:3000`:

1. **Get Mapping Domains**
   ```
   GET http://mock_service:3000/api/config/mappingDomain
   ```

2. **Get Mock Response**
   ```
   GET http://mock_service:3000/api/mock-responses/path
   ```

3. **Log Request**
   ```
   POST http://mock_service:3000/api/logs
   ```

## Verify Configuration

### 1. Kiểm tra SERVICE_URL trong container

```bash
docker-compose exec host_forward env | grep SERVICE_URL
# Output: SERVICE_URL=http://mock_service:3000
```

### 2. Test internal connection

```bash
# Từ host_forward container
docker-compose exec host_forward wget -O- http://mock_service:3000/health

# Hoặc từ host
docker-compose exec host_forward curl http://mock_service:3000/health
```

### 3. Kiểm tra logs

```bash
docker-compose logs host_forward | grep "Service URL"
# Sẽ thấy: Service URL: http://mock_service:3000
```

### 4. Test API call

```bash
# Xem logs khi host_forward call API
docker-compose logs -f host_forward | grep "STEP 2"
# Sẽ thấy: Calling API to get mapping for: /vietbank
# Và: Loaded X mapping(s) from API
```

## Troubleshooting

### Không kết nối được đến mock_service

1. **Kiểm tra service đang chạy:**
   ```bash
   docker-compose ps mock_service
   ```

2. **Kiểm tra network:**
   ```bash
   docker-compose exec host_forward ping mock_service
   ```

3. **Kiểm tra SERVICE_URL:**
   ```bash
   docker-compose exec host_forward env | grep SERVICE_URL
   ```

### API call timeout

1. **Kiểm tra mock_service logs:**
   ```bash
   docker-compose logs mock_service | tail -50
   ```

2. **Kiểm tra network connectivity:**
   ```bash
   docker-compose exec host_forward curl -v http://mock_service:3000/health
   ```

3. **Tăng timeout nếu cần:**
   - Trong code: `timeout: 5000` → `timeout: 10000`

## Migration từ Public Domain

### Trước (Public Domain):
```yaml
SERVICE_URL: http://fw.thangvnnc.io.vn:3000
```

### Sau (Internal):
```yaml
SERVICE_URL: http://mock_service:3000
```

**Lợi ích:**
- ✅ Nhanh hơn (internal network)
- ✅ An toàn hơn (không expose)
- ✅ Đáng tin cậy hơn (không phụ thuộc DNS)

## Lưu ý

1. **Service name phải đúng:**
   - Trong `docker-compose.yml`: `container_name: mock_service_app`
   - Nhưng service name là: `mock_service` (từ service definition)

2. **Port phải đúng:**
   - Internal port: `3000`
   - Không phải external port mapping

3. **Network phải cùng:**
   - Cả `host_forward` và `mock_service` phải trong cùng network
   - Network: `mock_service_network`

## Summary

- ✅ Host Forward gọi service qua Docker internal network
- ✅ Sử dụng service name: `mock_service:3000`
- ✅ Không cần public domain cho internal communication
- ✅ Nhanh hơn, an toàn hơn, đáng tin cậy hơn

