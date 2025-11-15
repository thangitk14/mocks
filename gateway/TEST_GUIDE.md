# Gateway Configuration Test Guide

## Tổng quan về các thay đổi

### 1. Vấn đề đã fix:
- **Vấn đề**: Các domain bổ sung (2fa.thangvnnc.io.vn, static.thangvnnc.io.vn, etc.) luôn redirect về fw.thangvnnc.io.vn
- **Nguyên nhân**:
  - File `http-only.conf.template` thiếu server blocks cho các domain bổ sung
  - File `.env.production` và `.env.developer` thiếu các biến môi trường domain

### 2. Các file đã được cập nhật:

#### a. `gateway/nginx/http-only.conf.template`
Đã thêm các server blocks cho:
- static.thangvnnc.io.vn → netlify:9999
- cp.thangvnnc.io.vn → codepushadmin:3001
- it.thangvnnc.io.vn → it container
- 2fa.thangvnnc.io.vn → 2fauth:8000
- codepush.thangvnnc.io.vn → codepush_server:3000
- minio-api.thangvnnc.io.vn → minio:9000
- minio-console.thangvnnc.io.vn → minio:9001

#### b. `.env.production`
Đã thêm:
```bash
# Gateway Domain Configuration
HOST_FORWARD_DOMAIN=fw.thangvnnc.io.vn
PORTAL_DOMAIN=tp.thangvnnc.io.vn
SERVICE_DOMAIN=sv.thangvnnc.io.vn
CERTBOT_EMAIL=thangvnnc@gmail.com

# Gateway Port Configuration
PUBLIC_GATEWAY_HTTP_PORT=80
PUBLIC_GATEWAY_HTTPS_PORT=443
```

#### c. `.env.developer`
Đã thêm các biến tương tự với giá trị localhost cho môi trường development

#### d. `.env.example`
Đã cập nhật với đầy đủ documentation cho các biến môi trường mới

## Hướng dẫn test

### Bước 1: Rebuild gateway container

```bash
# Stop gateway container
docker compose stop gateway_nginx

# Remove old container
docker compose rm -f gateway_nginx

# Rebuild and start with production config
docker compose --env-file .env.production up -d --build gateway_nginx
```

### Bước 2: Kiểm tra logs

```bash
# Xem logs của gateway
docker compose logs -f gateway_nginx

# Kiểm tra xem nginx config có được generate đúng không
docker compose exec gateway_nginx cat /etc/nginx/conf.d/default.conf
```

### Bước 3: Kiểm tra SSL certificates

Gateway sẽ tự động request SSL certificates cho tất cả các domain khi khởi động lần đầu.

```bash
# Kiểm tra danh sách certificates
docker compose exec gateway_nginx ls -la /etc/letsencrypt/live/

# Kiểm tra certificate cho từng domain
docker compose exec gateway_nginx certbot certificates
```

### Bước 4: Test từng domain

Sau khi SSL certificates được tạo, test từng domain:

```bash
# Test HTTP redirect to HTTPS
curl -I http://2fa.thangvnnc.io.vn
# Expect: 301 redirect to https://2fa.thangvnnc.io.vn

# Test HTTPS
curl -I https://2fa.thangvnnc.io.vn
# Expect: 200 OK (hoặc tùy vào service response)

# Test các domain khác
curl -I https://static.thangvnnc.io.vn
curl -I https://cp.thangvnnc.io.vn
curl -I https://it.thangvnnc.io.vn
curl -I https://codepush.thangvnnc.io.vn
curl -I https://minio-api.thangvnnc.io.vn
curl -I https://minio-console.thangvnnc.io.vn
```

### Bước 5: Verify routing

Kiểm tra xem mỗi domain có route đến đúng service không:

```bash
# Kiểm tra logs của từng service khi truy cập domain
docker compose logs -f 2fauth
docker compose logs -f netlify
docker compose logs -f codepushadmin
docker compose logs -f it
docker compose logs -f codepush_server
docker compose logs -f minio
```

## Troubleshooting

### Lỗi: Certificate generation failed

Nếu certbot không tạo được certificate:

1. Kiểm tra DNS đã trỏ đúng chưa:
```bash
nslookup 2fa.thangvnnc.io.vn
nslookup static.thangvnnc.io.vn
# ... các domain khác
```

2. Kiểm tra port 80 có accessible không:
```bash
curl http://2fa.thangvnnc.io.vn/.well-known/acme-challenge/test
```

3. Kiểm tra rate limit của Let's Encrypt:
```bash
docker compose exec gateway_nginx certbot certificates
```

4. Request certificate manually:
```bash
docker compose exec gateway_nginx certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d 2fa.thangvnnc.io.vn \
  --email thangvnnc@gmail.com \
  --agree-tos \
  --no-eff-email
```

### Lỗi: Domain vẫn redirect về fw.thangvnnc.io.vn

1. Kiểm tra nginx config:
```bash
docker compose exec gateway_nginx nginx -t
```

2. Kiểm tra server blocks:
```bash
docker compose exec gateway_nginx grep -A 10 "server_name 2fa" /etc/nginx/conf.d/default.conf
```

3. Reload nginx:
```bash
docker compose exec gateway_nginx nginx -s reload
```

### Lỗi: 502 Bad Gateway

Service backend chưa chạy hoặc không accessible:

```bash
# Kiểm tra status của tất cả containers
docker compose ps

# Start service nếu chưa chạy
docker compose up -d 2fauth netlify codepushadmin it codepush_server minio

# Kiểm tra network connectivity
docker compose exec gateway_nginx ping 2fauth
docker compose exec gateway_nginx ping netlify
```

## Các file cấu hình quan trọng

1. `gateway/nginx/nginx.conf` - Main nginx config
2. `gateway/nginx/default.conf.template` - HTTPS server blocks (used when SSL certs exist)
3. `gateway/nginx/http-only.conf.template` - HTTP server blocks (used during cert generation)
4. `gateway/nginx/entrypoint.sh` - Startup script handles cert generation
5. `gateway/nginx/Dockerfile` - Docker image definition

## Certificate renewal

Certificates sẽ tự động renew thông qua cron job được setup trong entrypoint.sh:

```bash
# Kiểm tra cron job
docker compose exec gateway_nginx crontab -l

# Manual renewal
docker compose exec gateway_nginx certbot renew --dry-run
docker compose exec gateway_nginx certbot renew
```

## Production Deployment Checklist

- [ ] DNS records đã trỏ đúng cho tất cả các domain
- [ ] Port 80 và 443 đã mở trên firewall
- [ ] File `.env.production` đã được configure đúng
- [ ] Tất cả backend services đã running
- [ ] Gateway container đã rebuild với cấu hình mới
- [ ] SSL certificates đã được generate thành công
- [ ] Test tất cả các domain (HTTP redirect và HTTPS)
- [ ] Verify routing đến đúng backend service
- [ ] Certificate auto-renewal đã được setup

## Notes

- Lần đầu tiên start gateway, nó sẽ chạy trong HTTP-only mode để generate certificates
- Sau khi certificates được tạo, gateway sẽ reload với HTTPS configuration
- Nếu bạn thêm domain mới, cần rebuild gateway container để request certificate mới
- Let's Encrypt có rate limit: 50 certificates per week per domain
