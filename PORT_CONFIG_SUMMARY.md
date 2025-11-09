# Tóm tắt Cấu hình Ports - Production

## Port Configuration

### Services trên cùng 1 Public IP

| Service | Internal Port | External Port | Access URL |
|---------|--------------|---------------|------------|
| **Portal** | 80 (nginx) | **8910** | `http://YOUR_PUBLIC_IP:8910` |
| **Host Forward** | 4000 | **80** | `http://YOUR_PUBLIC_IP` |
| **Backend API** | 3000 | **3000** | `http://YOUR_PUBLIC_IP:3000` |
| **MySQL** | 3306 | 3306 | Internal only |

## Cấu hình đã thay đổi

### 1. Docker Compose (`docker-compose.yml`)

**Portal:**
```yaml
ports:
  - "0.0.0.0:8910:80"  # External:8910 → Internal:80
```

**Host Forward:**
```yaml
ports:
  - "0.0.0.0:80:4000"  # External:80 → Internal:4000
```

**Backend Service:**
```yaml
ports:
  - "0.0.0.0:3000:3000"  # Public access
```

### 2. Portal Auto-Detect API URL

Portal tự động detect API URL:
- Portal URL: `http://YOUR_PUBLIC_IP:8910`
- Auto-detect API: `http://YOUR_PUBLIC_IP:3000`

**Code logic:**
```javascript
// Lấy hostname từ current URL
const hostname = window.location.hostname
// Thêm port 3000
const apiUrl = `${protocol}//${hostname}:3000`
```

### 3. Socket.IO

Tương tự API, tự động detect:
- Portal: `http://YOUR_PUBLIC_IP:8910`
- Socket: `http://YOUR_PUBLIC_IP:3000`

## Deploy

### 1. Mở Firewall
```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp      # Host Forward
sudo ufw allow 8910/tcp    # Portal
sudo ufw allow 3000/tcp    # Backend API
sudo ufw reload

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=8910/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 2. Build và Deploy
```bash
docker-compose build --no-cache portal host_forward
docker-compose up -d
```

### 3. Kiểm tra
```bash
# Portal
curl http://localhost:8910/health
curl http://YOUR_PUBLIC_IP:8910/health

# Host Forward
curl http://localhost/health
curl http://YOUR_PUBLIC_IP/health

# Backend API
curl http://localhost:3000/health
curl http://YOUR_PUBLIC_IP:3000/health
```

## Access URLs

Sau khi deploy, các services accessible tại:

- **Portal**: `http://YOUR_PUBLIC_IP:8910`
- **Host Forward**: `http://YOUR_PUBLIC_IP`
- **Backend API**: `http://YOUR_PUBLIC_IP:3000`

## Lưu ý

1. **Portal tự động detect API URL** - Không cần cấu hình thêm
2. **Host Forward** có thể dùng Docker service name (internal) hoặc public IP
3. **Backend API** đã expose ra public để Portal và Host Forward có thể call
4. Tất cả services chạy trên **cùng 1 public IP**, chỉ khác ports

