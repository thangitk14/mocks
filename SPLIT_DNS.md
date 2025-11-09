# Split DNS Configuration

## Tổng quan

Split DNS cho phép domain trỏ đến các IP khác nhau tùy thuộc vào vị trí của client:
- **Bên ngoài (External)**: Domain → Public IP
- **Bên trong (Internal)**: Domain → Private IP (0.0.0.0)

## Cấu hình

### 1. DNS Server nội bộ (Internal DNS Server)

Cấu hình DNS server nội bộ để trả về Private IP (0.0.0.0) cho các domain:

#### BIND9 (Linux)

File `/etc/bind/db.internal`:
```
$TTL    604800
@       IN      SOA     ns1.internal. admin.internal. (
                          2024010101     ; Serial
                          604800         ; Refresh
                          86400          ; Retry
                          2419200        ; Expire
                          604800 )       ; Negative Cache TTL
;
@       IN      NS      ns1.internal.
@       IN      A       0.0.0.0

; Domain mappings
fw.thangvnnc.io.vn.     IN      A       0.0.0.0
*.thangvnnc.io.vn.      IN      A       0.0.0.0
```

File `/etc/bind/named.conf.local`:
```
zone "thangvnnc.io.vn" {
    type master;
    file "/etc/bind/db.internal";
};
```

#### Windows Server DNS

1. Mở **DNS Manager**
2. Tạo **Forward Lookup Zone** cho `thangvnnc.io.vn`
3. Thêm **A Record**:
   - Name: `fw`
   - IP Address: `0.0.0.0`
4. Thêm **Wildcard A Record**:
   - Name: `*`
   - IP Address: `0.0.0.0`

### 2. File hosts (Cho máy nội bộ)

Sử dụng file hosts để override DNS cho các máy nội bộ không có DNS server riêng.

#### Linux / macOS

File: `/etc/hosts`
```
# Split DNS - Internal Network
# Domain trỏ về Private IP (0.0.0.0) cho mạng nội bộ
0.0.0.0    fw.thangvnnc.io.vn
```

#### Windows

File: `C:\Windows\System32\drivers\etc\hosts`
```
# Split DNS - Internal Network
# Domain trỏ về Private IP (0.0.0.0) cho mạng nội bộ
0.0.0.0    fw.thangvnnc.io.vn
```

### 3. Cấu hình Router/Firewall

Đảm bảo router/firewall nội bộ có DNS server được cấu hình đúng:
- Primary DNS: Internal DNS Server (trả về 0.0.0.0)
- Secondary DNS: Public DNS (8.8.8.8, 1.1.1.1) - chỉ dùng khi internal DNS không khả dụng

## Script tự động

### Linux / macOS

Sử dụng script `setup-internal-hosts.sh` để tự động cấu hình file hosts:

```bash
./setup-internal-hosts.sh
```

### Windows

Sử dụng script `setup-internal-hosts.ps1` (PowerShell):

```powershell
.\setup-internal-hosts.ps1
```

## Kiểm tra cấu hình

### Kiểm tra DNS resolution

```bash
# Từ máy nội bộ
nslookup fw.thangvnnc.io.vn
# Kết quả mong đợi: 0.0.0.0

# Từ máy bên ngoài
nslookup fw.thangvnnc.io.vn
# Kết quả mong đợi: Public IP
```

### Kiểm tra hosts file

```bash
# Linux / macOS
cat /etc/hosts | grep fw.thangvnnc.io.vn

# Windows
type C:\Windows\System32\drivers\etc\hosts | findstr fw.thangvnnc.io.vn
```

## Lưu ý

1. **0.0.0.0** là địa chỉ IP đặc biệt:
   - Trong file hosts: có thể dùng để block domain hoặc route về localhost
   - Trong DNS: có thể dùng để route về local network interface

2. **Bảo mật**: Đảm bảo DNS server nội bộ chỉ accessible từ mạng nội bộ

3. **Firewall**: Cấu hình firewall để cho phép traffic từ mạng nội bộ đến Private IP

4. **Testing**: Luôn test cả từ mạng nội bộ và bên ngoài để đảm bảo Split DNS hoạt động đúng

## Troubleshooting

### Domain không resolve về 0.0.0.0 từ mạng nội bộ

1. Kiểm tra DNS server configuration
2. Kiểm tra file hosts có được apply chưa
3. Clear DNS cache:
   ```bash
   # Linux
   sudo systemd-resolve --flush-caches
   
   # macOS
   sudo dscacheutil -flushcache
   
   # Windows
   ipconfig /flushdns
   ```

### Domain vẫn resolve về Public IP từ mạng nội bộ

1. Kiểm tra DNS server priority trong network settings
2. Đảm bảo internal DNS server được set làm primary DNS
3. Kiểm tra firewall rules có block DNS queries không

