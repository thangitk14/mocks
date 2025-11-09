# Hướng dẫn Deploy Portal và Host Forward ra Public IP

## Tổng quan

Hướng dẫn deploy Portal (port 80) và Host Forward (port 4000) ra public IP để có thể truy cập từ internet.

## Kiểm tra cấu hình hiện tại

### 1. Portal (Frontend)
- **Port**: 8910 (HTTP)
- **Listen**: 0.0.0.0 (đã cấu hình trong nginx)
- **Build**: Sử dụng `.env.production` file
- **Access**: `http://YOUR_PUBLIC_IP:8910` hoặc `http://YOUR_DOMAIN:8910`

### 2. Host Forward (Gateway)
- **Port**: 80
- **Listen**: 0.0.0.0 (đã cấu hình trong code)
- **Access**: `http://YOUR_PUBLIC_IP` hoặc `http://YOUR_DOMAIN`

### 3. Backend Service (Internal)
- **Port**: 3000 (có thể expose hoặc không)
- **Listen**: 0.0.0.0 (đã cấu hình)
- **Access**: Chỉ internal, không cần expose ra ngoài

## Bước 1: Kiểm tra Firewall

### Ubuntu/Debian
```bash
# Kiểm tra firewall status
sudo ufw status

# Mở port 80 (Host Forward)
sudo ufw allow 80/tcp

# Mở port 8910 (Portal)
sudo ufw allow 8910/tcp

# Nếu cần HTTPS, mở port 443
sudo ufw allow 443/tcp

# Reload firewall
sudo ufw reload
```

### CentOS/RHEL
```bash
# Kiểm tra firewall status
sudo firewall-cmd --state

# Mở port 80 (Host Forward)
sudo firewall-cmd --permanent --add-port=80/tcp

# Mở port 8910 (Portal)
sudo firewall-cmd --permanent --add-port=8910/tcp

# Reload firewall
sudo firewall-cmd --reload
```

## Bước 2: Kiểm tra Ports đã được expose

```bash
# Kiểm tra docker-compose ports
docker-compose config | grep -A 2 "ports:"

# Kiểm tra containers đang chạy
docker-compose ps

# Kiểm tra ports đang listen
sudo netstat -tlnp | grep -E ":(80|8910|3000)"
# hoặc
sudo ss -tlnp | grep -E ":(80|8910|3000)"
```

## Bước 3: Cấu hình .env.production

### Portal (.env.production)
```bash
# File: portal/.env.production
# Để trống để sử dụng relative paths (khuyến nghị)
# VITE_API_BASE_URL=
```

### Host Forward (.env.production)
```bash
# File: host_forward/.env.production
NODE_ENV=production
PORT=4000
SERVICE_URL=http://mock_service:3000
```

## Bước 4: Build và Deploy

### Build tất cả services
```bash
# Build với production mode
docker-compose build --no-cache

# Hoặc build từng service
docker-compose build portal
docker-compose build host_forward
```

### Start services
```bash
# Start tất cả services
docker-compose up -d

# Hoặc start chỉ portal và host_forward
docker-compose up -d portal host_forward mock_service mock_mysql
```

### Kiểm tra logs
```bash
# Xem logs portal
docker-compose logs -f portal

# Xem logs host_forward
docker-compose logs -f host_forward

# Xem logs tất cả
docker-compose logs -f
```

## Bước 5: Kiểm tra Services

### Kiểm tra Portal
```bash
# Từ server
curl http://localhost:8910/health
curl http://localhost:8910/api/health

# Từ browser hoặc external
curl http://YOUR_PUBLIC_IP:8910/health
curl http://YOUR_PUBLIC_IP:8910/api/health
```

### Kiểm tra Host Forward
```bash
# Từ server
curl http://localhost/health

# Từ browser hoặc external
curl http://YOUR_PUBLIC_IP/health
```

### Kiểm tra Backend (Internal)
```bash
# Chỉ từ trong Docker network
docker-compose exec portal curl http://mock_service:3000/health
```

## Bước 6: Cấu hình Domain (Optional)

### Nếu có domain name

1. **Point DNS** đến public IP:
   ```
   A Record: your-domain.com -> YOUR_PUBLIC_IP
   A Record: *.your-domain.com -> YOUR_PUBLIC_IP
   ```

2. **Cập nhật nginx config** (nếu cần):
   ```nginx
   server_name your-domain.com www.your-domain.com;
   ```

3. **Portal sẽ tự động detect domain** và sử dụng relative paths

## Bước 7: Security Considerations

### 1. Chỉ expose cần thiết
- ✅ Portal (port 80) - Public
- ✅ Host Forward (port 4000) - Public
- ❌ Backend API (port 3000) - Không cần expose (internal only)
- ❌ MySQL (port 3306) - Không expose ra ngoài

### 2. Sử dụng HTTPS (Khuyến nghị)
```bash
# Cài đặt certbot
sudo apt-get install certbot python3-certbot-nginx

# Tạo SSL certificate
sudo certbot --nginx -d your-domain.com
```

### 3. Cập nhật nginx cho HTTPS
Cần tạo nginx config mới với SSL hoặc sử dụng reverse proxy.

## Troubleshooting

### Portal không accessible từ public IP

1. **Kiểm tra firewall**:
   ```bash
   sudo ufw status
   ```

2. **Kiểm tra container đang chạy**:
   ```bash
   docker-compose ps portal
   ```

3. **Kiểm tra nginx logs**:
   ```bash
   docker-compose logs portal | grep nginx
   ```

4. **Kiểm tra port binding**:
   ```bash
   sudo netstat -tlnp | grep :8910
   ```

### Host Forward không accessible

1. **Kiểm tra container**:
   ```bash
   docker-compose ps host_forward
   ```

2. **Kiểm tra logs**:
   ```bash
   docker-compose logs host_forward
   ```

3. **Kiểm tra listen address**:
   ```bash
   docker-compose logs host_forward | grep "Listening on"
   # Phải thấy: "Listening on 0.0.0.0"
   ```

### API calls fail từ Portal

1. **Kiểm tra nginx proxy**:
   ```bash
   docker-compose exec portal cat /etc/nginx/conf.d/default.conf
   ```

2. **Test proxy từ portal container**:
   ```bash
   docker-compose exec portal curl http://mock_service:3000/health
   ```

3. **Kiểm tra console logs** trong browser:
   - Phải thấy: `[API] Production mode - using relative path`

## Quick Deploy Script

```bash
#!/bin/bash
# deploy.sh

echo "Building services..."
docker-compose build --no-cache portal host_forward

echo "Starting services..."
docker-compose up -d

echo "Waiting for services to start..."
sleep 5

echo "Checking services..."
docker-compose ps

echo "Testing Portal..."
curl -f http://localhost/health || echo "Portal health check failed"

echo "Testing Host Forward..."
curl -f http://localhost:4000/health || echo "Host Forward health check failed"

echo "Deploy complete!"
echo "Portal: http://$(curl -s ifconfig.me):8910"
echo "Host Forward: http://$(curl -s ifconfig.me)"
```

## Checklist trước khi deploy

- [ ] Firewall đã mở port 80 và 8910
- [ ] `.env.production` files đã được cấu hình đúng
- [ ] Docker containers đã được build với production mode
- [ ] Services đang listen trên 0.0.0.0
- [ ] Health checks đều pass
- [ ] Logs không có errors
- [ ] DNS đã point đến public IP (nếu có domain)
- [ ] SSL certificate đã được cấu hình (nếu dùng HTTPS)

