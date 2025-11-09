# Cấu hình Domain: fw.thangvnnc.io.vn

## Tổng quan

Tất cả services chạy trên domain: **fw.thangvnnc.io.vn**

## Port Configuration

| Service | Port | Access URL |
|---------|------|------------|
| **Portal** | 8910 | `http://fw.thangvnnc.io.vn:8910` |
| **Host Forward** | 80 | `http://fw.thangvnnc.io.vn` |
| **Backend API** | 3000 | `http://fw.thangvnnc.io.vn:3000` |

## Cấu hình đã thiết lập

### 1. Portal (.env.production)

```bash
# File: portal/.env.production
VITE_API_BASE_URL=http://fw.thangvnnc.io.vn:3000
```

**Cách hoạt động:**
- Portal sẽ gọi API đến: `http://fw.thangvnnc.io.vn:3000`
- Socket.IO cũng sẽ kết nối đến: `http://fw.thangvnnc.io.vn:3000`

### 2. Host Forward (.env.production)

```bash
# File: host_forward/.env.production
NODE_ENV=production
PORT=4000
SERVICE_URL=http://fw.thangvnnc.io.vn:3000
```

**Cách hoạt động:**
- Host Forward sẽ gọi API đến: `http://fw.thangvnnc.io.vn:3000`
- Sử dụng domain thay vì Docker service name để đảm bảo hoạt động từ bên ngoài

### 3. Nginx Configuration

```nginx
server_name fw.thangvnnc.io.vn _;
```

- Nginx sẽ accept requests từ domain `fw.thangvnnc.io.vn`
- Vẫn accept từ các domain khác (fallback `_`)

### 4. Docker Compose

**Host Forward default SERVICE_URL:**
```yaml
SERVICE_URL: ${SERVICE_URL:-http://fw.thangvnnc.io.vn:3000}
```

## DNS Configuration

Đảm bảo DNS đã được cấu hình:

```
A Record: fw.thangvnnc.io.vn → YOUR_PUBLIC_IP
```

## Deploy Steps

### 1. Rebuild Portal (vì thay đổi .env.production)
```bash
docker-compose build --no-cache portal
```

### 2. Restart Host Forward (vì thay đổi .env.production)
```bash
docker-compose restart host_forward
```

### 3. Hoặc rebuild và restart tất cả
```bash
docker-compose build --no-cache portal host_forward
docker-compose up -d
```

## Kiểm tra

### 1. Kiểm tra Portal
```bash
# Từ server
curl http://localhost:8910/health

# Từ domain
curl http://fw.thangvnnc.io.vn:8910/health

# Mở browser
# URL: http://fw.thangvnnc.io.vn:8910
# Console sẽ thấy: [API] Using VITE_API_BASE_URL: http://fw.thangvnnc.io.vn:3000
```

### 2. Kiểm tra Host Forward
```bash
# Từ server
curl http://localhost/health

# Từ domain
curl http://fw.thangvnnc.io.vn/health

# Xem logs
docker-compose logs host_forward | grep "Service URL"
# Sẽ thấy: Service URL: http://fw.thangvnnc.io.vn:3000
```

### 3. Kiểm tra Backend API
```bash
# Từ domain
curl http://fw.thangvnnc.io.vn:3000/health
```

## Troubleshooting

### Portal không call được API

1. **Kiểm tra .env.production:**
   ```bash
   cat portal/.env.production | grep VITE_API_BASE_URL
   # Phải thấy: VITE_API_BASE_URL=http://fw.thangvnnc.io.vn:3000
   ```

2. **Rebuild portal:**
   ```bash
   docker-compose build --no-cache portal
   docker-compose up -d portal
   ```

3. **Kiểm tra browser console:**
   - Mở http://fw.thangvnnc.io.vn:8910
   - Xem console log: `[API] Using VITE_API_BASE_URL: http://fw.thangvnnc.io.vn:3000`

### Host Forward không call được API

1. **Kiểm tra .env.production:**
   ```bash
   cat host_forward/.env.production | grep SERVICE_URL
   # Phải thấy: SERVICE_URL=http://fw.thangvnnc.io.vn:3000
   ```

2. **Restart host_forward:**
   ```bash
   docker-compose restart host_forward
   ```

3. **Kiểm tra logs:**
   ```bash
   docker-compose logs host_forward | grep "Service URL"
   ```

### DNS không resolve

1. **Kiểm tra DNS:**
   ```bash
   nslookup fw.thangvnnc.io.vn
   dig fw.thangvnnc.io.vn
   ```

2. **Kiểm tra từ server:**
   ```bash
   curl -v http://fw.thangvnnc.io.vn:3000/health
   ```

## Summary

- ✅ Portal: `http://fw.thangvnnc.io.vn:8910` → API: `http://fw.thangvnnc.io.vn:3000`
- ✅ Host Forward: `http://fw.thangvnnc.io.vn` → API: `http://fw.thangvnnc.io.vn:3000`
- ✅ Backend API: `http://fw.thangvnnc.io.vn:3000`
- ✅ Tất cả services gọi API qua domain thay vì localhost/Docker service name

