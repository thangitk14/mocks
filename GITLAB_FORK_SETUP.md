# Hướng dẫn cấu hình Fork để kết nối với GitLab local

## Vấn đề
Fork (Git client) không thể kết nối với GitLab khi ở trong mạng local, mặc dù trình duyệt hoạt động bình thường.

## Giải pháp

### 1. Cấu hình Fork để chấp nhận SSL certificate

Fork có thể từ chối kết nối do vấn đề với SSL certificate. Có một số cách để xử lý:

#### Cách 1: Thêm certificate vào Keychain (macOS)
1. Mở Terminal và chạy:
```bash
# Tải certificate từ GitLab
openssl s_client -showcerts -connect gitlab.thangvnnc.io.vn:443 </dev/null 2>/dev/null | openssl x509 -outform PEM > gitlab.crt

# Thêm vào Keychain
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain gitlab.crt
```

#### Cách 2: Cấu hình Git để bỏ qua SSL verification (không khuyến khích cho production)
```bash
git config --global http.sslVerify false
# HOẶC chỉ cho domain cụ thể
git config --global http."https://gitlab.thangvnnc.io.vn".sslVerify false
```

### 2. Cấu hình Fork để sử dụng đúng URL

1. Mở Fork
2. Vào Settings → Git
3. Đảm bảo URL được cấu hình đúng: `https://gitlab.thangvnnc.io.vn`
4. Nếu clone repository, sử dụng URL đầy đủ:
   ```
   https://gitlab.thangvnnc.io.vn/username/repository.git
   ```

### 3. Cấu hình SSH (nếu sử dụng SSH)

Nếu bạn muốn sử dụng SSH thay vì HTTPS:

1. Trong Fork, vào Settings → SSH Keys
2. Thêm SSH key của bạn vào GitLab
3. Cấu hình SSH config (`~/.ssh/config`):
   ```
   Host gitlab.thangvnnc.io.vn
       HostName gitlab.thangvnnc.io.vn
       Port 2222
       User git
       IdentityFile ~/.ssh/your_private_key
   ```

4. Clone repository bằng SSH:
   ```
   git@gitlab.thangvnnc.io.vn:username/repository.git
   ```

### 4. Kiểm tra kết nối

Kiểm tra xem Fork có thể kết nối được không:
```bash
# Test HTTPS connection
curl -I https://gitlab.thangvnnc.io.vn

# Test Git clone
git clone https://gitlab.thangvnnc.io.vn/username/repository.git
```

### 5. Troubleshooting

Nếu vẫn gặp vấn đề:

1. **Kiểm tra hosts file**: Đảm bảo `gitlab.thangvnnc.io.vn` trỏ về đúng IP
   ```bash
   cat /etc/hosts | grep gitlab
   ```

2. **Kiểm tra firewall**: Đảm bảo port 443 và 2222 (nếu dùng SSH) không bị chặn

3. **Kiểm tra GitLab logs**:
   ```bash
   docker compose logs gitlab_ce | tail -50
   ```

4. **Kiểm tra nginx logs**:
   ```bash
   docker compose logs gateway_nginx | tail -50
   ```

5. **Reset GitLab configuration** (nếu cần):
   ```bash
   docker compose restart gitlab_ce
   docker compose exec gitlab_ce gitlab-ctl reconfigure
   ```

## Lưu ý

- Certificate từ Let's Encrypt có thể không được tin cậy trong môi trường local nếu DNS không được cấu hình đúng
- Nếu sử dụng hosts file để trỏ domain về local IP, một số ứng dụng có thể không tuân theo hosts file
- Fork có thể cache SSL certificate, cần restart Fork sau khi thay đổi certificate

