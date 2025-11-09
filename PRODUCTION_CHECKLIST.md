# Production Build & Deploy Checklist

## ✅ Cấu hình đã kiểm tra

### 1. Portal (Frontend)
- [x] Dockerfile build với `--mode production`
- [x] Sử dụng `.env.production` file
- [x] Nginx listen trên port 80 (internal)
- [x] Nginx proxy `/api/*` đến `mock_service:3000`
- [x] Nginx proxy `/socket.io/*` đến `mock_service:3000`
- [x] Port binding: `0.0.0.0:8910:80` (accept từ public IP trên port 8910)
- [x] Code tự động detect API URL: `http://hostname:3000`

### 2. Host Forward (Gateway)
- [x] Dockerfile set `NODE_ENV=production`
- [x] Listen trên `0.0.0.0:4000` trong production (internal)
- [x] Port binding: `0.0.0.0:80:4000` (accept từ public IP trên port 80)
- [x] SERVICE_URL sử dụng Docker service name: `http://mock_service:3000`

### 3. Backend Service
- [x] Listen trên `0.0.0.0:3000` trong production
- [x] Kết nối database qua Docker service name: `mock_mysql`
- [x] Port 3000 không cần expose ra ngoài (internal only)

### 4. Environment Files
- [x] `portal/.env.production` - VITE_API_BASE_URL để trống (relative paths)
- [x] `host_forward/.env.production` - SERVICE_URL = http://mock_service:3000
- [x] `service/.env.production` - Database và JWT config

### 5. Docker Compose
- [x] Portal port: `0.0.0.0:80:80`
- [x] Host Forward port: `0.0.0.0:4000:4000`
- [x] Backend port: `3000:3000` (internal, có thể expose nếu cần)
- [x] Tất cả services trong cùng network: `mock_service_network`

## 🚀 Deploy Steps

### Bước 1: Chạy script kiểm tra
```bash
./check-production.sh
```

### Bước 2: Mở firewall ports
```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 8910/tcp
sudo ufw reload

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=8910/tcp
sudo firewall-cmd --reload
```

### Bước 3: Build và Deploy
```bash
# Build với production mode
docker-compose build --no-cache portal host_forward

# Start services
docker-compose up -d

# Kiểm tra logs
docker-compose logs -f portal host_forward
```

### Bước 4: Kiểm tra services
```bash
# Portal health check
curl http://localhost:8910/health
curl http://localhost:8910/api/health

# Host Forward health check
curl http://localhost/health

# Kiểm tra từ public IP
PUBLIC_IP=$(curl -s ifconfig.me)
curl http://$PUBLIC_IP:8910/health
curl http://$PUBLIC_IP/health
```

## 🔍 Verification

### Portal
- ✅ Accessible từ: `http://YOUR_PUBLIC_IP:8910`
- ✅ API calls tự động detect: `http://YOUR_PUBLIC_IP:3000`
- ✅ Nginx proxy hoạt động đúng
- ✅ Socket.IO kết nối được

### Host Forward
- ✅ Accessible từ: `http://YOUR_PUBLIC_IP` (port 80)
- ✅ Listen trên 0.0.0.0:4000 (internal), expose ra port 80 (external)
- ✅ Kết nối được với backend service

### Backend (Internal)
- ✅ Chỉ accessible từ Docker network
- ✅ Portal và Host Forward có thể gọi được
- ✅ Không cần expose ra ngoài

## 📝 Files Summary

### Configuration Files
- `docker-compose.yml` - Service definitions và ports
- `portal/.env.production` - Portal environment variables
- `host_forward/.env.production` - Host Forward environment variables
- `service/.env.production` - Backend environment variables

### Dockerfiles
- `portal/Dockerfile` - Multi-stage build với Vite + Nginx
- `host_forward/Dockerfile` - Node.js production build
- `service/Dockerfile` - Node.js production build

### Scripts
- `check-production.sh` - Script kiểm tra cấu hình
- `DEPLOY_PUBLIC_IP.md` - Hướng dẫn deploy chi tiết

## ⚠️ Security Notes

1. **Firewall**: Chỉ mở ports cần thiết (80, 4000)
2. **Backend API**: Không expose port 3000 ra ngoài
3. **Database**: Không expose port 3306 ra ngoài
4. **HTTPS**: Nên cấu hình SSL/TLS cho production
5. **JWT Secret**: Đổi `JWT_SECRET` trong production

## 🐛 Troubleshooting

Xem file `DEPLOY_PUBLIC_IP.md` để biết chi tiết troubleshooting.

