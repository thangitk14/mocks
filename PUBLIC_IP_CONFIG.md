# Cấu hình Public IP cho Portal và Host Forward

## Tổng quan

Sau khi deploy, Portal và Host Forward cần gọi API service qua public IP thay vì localhost.

## Cấu hình

### 1. Service (Backend API) - Port 3000

**Đã expose ra public IP:**
- Port binding: `0.0.0.0:3000:3000`
- Accessible từ: `http://YOUR_PUBLIC_IP:3000`

### 2. Portal (Frontend) - Port 8910

**Tự động detect API URL:**
- Portal chạy trên port 8910
- Portal sẽ tự động detect domain/IP hiện tại
- Tự động thêm port 3000: `http://YOUR_DOMAIN:3000` hoặc `http://YOUR_IP:3000`
- Không cần cấu hình thêm nếu deploy trên cùng server

**Hoặc cấu hình manual trong `.env.production`:**
```bash
# File: portal/.env.production
VITE_API_BASE_URL=http://YOUR_PUBLIC_IP:3000
# hoặc
VITE_API_BASE_URL=http://api.example.com:3000
```

### 3. Host Forward (Gateway) - Port 80

**Cấu hình trong `.env.production`:**
```bash
# File: host_forward/.env.production

# Option 1: Docker internal (khuyến nghị - nhanh hơn)
SERVICE_URL=http://mock_service:3000

# Option 2: Public IP (nếu cần call từ bên ngoài Docker)
SERVICE_URL=http://YOUR_PUBLIC_IP:3000
```

**Port mapping:**
- Internal port: 4000 (container)
- External port: 80 (public)

## Cách hoạt động

### Portal Auto-Detection

Portal tự động detect API URL dựa trên:
1. Nếu có `VITE_API_BASE_URL` trong `.env.production` → dùng giá trị đó
2. Nếu không có → tự động detect từ `window.location`:
   - Lấy `hostname` và `protocol` từ current URL
   - Thêm port 3000: `${protocol}//${hostname}:3000`
   - Ví dụ: Nếu portal ở `http://123.45.67.89:8910` → API sẽ là `http://123.45.67.89:3000`

### Host Forward

Host Forward có thể:
- Dùng Docker service name: `http://mock_service:3000` (internal, nhanh hơn)
- Dùng public IP: `http://YOUR_PUBLIC_IP:3000` (nếu cần)

## Deploy Steps

### 1. Lấy Public IP
```bash
# Từ server
curl ifconfig.me
# hoặc
hostname -I | awk '{print $1}'
```

### 2. Cấu hình Portal (Optional)

Nếu muốn set cụ thể, edit `portal/.env.production`:
```bash
VITE_API_BASE_URL=http://YOUR_PUBLIC_IP:3000
```

### 3. Cấu hình Host Forward (Optional)

Nếu muốn dùng public IP thay vì Docker service name, edit `host_forward/.env.production`:
```bash
SERVICE_URL=http://YOUR_PUBLIC_IP:3000
```

### 4. Rebuild và Deploy
```bash
# Rebuild portal (nếu thay đổi .env.production)
docker-compose build --no-cache portal

# Rebuild host_forward (nếu thay đổi .env.production)
docker-compose build --no-cache host_forward

# Start services
docker-compose up -d
```

## Kiểm tra

### 1. Kiểm tra Service accessible
```bash
# Từ server
curl http://localhost:3000/health

# Từ external
curl http://YOUR_PUBLIC_IP:3000/health
```

### 2. Kiểm tra Portal
```bash
# Từ server
curl http://localhost:8910/health

# Từ external
curl http://YOUR_PUBLIC_IP:8910/health

# Mở browser console khi truy cập Portal
# Sẽ thấy: [API] Production mode - detected API URL: http://YOUR_IP:3000
```

### 3. Kiểm tra Host Forward
```bash
# Từ server
curl http://localhost/health

# Từ external
curl http://YOUR_PUBLIC_IP/health

# Xem logs
docker-compose logs host_forward | grep "Service URL"
# Sẽ thấy: Service URL: http://...
```

## Troubleshooting

### Portal vẫn call localhost:3000

1. **Kiểm tra build mode:**
   ```bash
   docker-compose logs portal | grep "MODE"
   # Phải thấy: Mode: production
   ```

2. **Kiểm tra .env.production:**
   ```bash
   cat portal/.env.production
   ```

3. **Rebuild portal:**
   ```bash
   docker-compose build --no-cache portal
   docker-compose up -d portal
   ```

4. **Kiểm tra console logs:**
   - Mở browser console
   - Xem log: `[API] Production mode - detected API URL: ...`

### Host Forward không connect được service

1. **Kiểm tra SERVICE_URL:**
   ```bash
   docker-compose exec host_forward env | grep SERVICE_URL
   ```

2. **Test connection:**
   ```bash
   # Nếu dùng Docker service name
   docker-compose exec host_forward curl http://mock_service:3000/health
   
   # Nếu dùng public IP
   docker-compose exec host_forward curl http://YOUR_PUBLIC_IP:3000/health
   ```

3. **Kiểm tra firewall:**
   ```bash
   sudo ufw status | grep 3000
   ```

## Best Practices

1. **Portal**: Để auto-detect (không set VITE_API_BASE_URL) - sẽ tự động dùng đúng domain/IP
2. **Host Forward**: Dùng Docker service name (`http://mock_service:3000`) nếu cùng network - nhanh hơn
3. **Service**: Luôn expose port 3000 ra public để có thể call từ bên ngoài
4. **Firewall**: Mở port 3000 nếu cần access từ external

