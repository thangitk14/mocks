# User State Management

Hướng dẫn quản lý trạng thái và thời hạn của user accounts.

## Tổng quan

Mỗi user có 2 fields để quản lý trạng thái tài khoản:

1. **state** (ENUM): Trạng thái hiện tại của user
   - `Active`: User đang hoạt động bình thường
   - `InActive`: User bị vô hiệu hóa tạm thời
   - `Expired`: User đã hết hạn

2. **expired_time** (DATETIME, nullable): Thời gian hết hạn của tài khoản
   - Nếu NULL: Không có thời hạn
   - Nếu có giá trị: Tài khoản sẽ hết hạn sau thời điểm này

## User States

### Active
User có thể login và sử dụng hệ thống bình thường.

```sql
UPDATE users SET state = 'Active' WHERE id = 1;
```

### InActive
User bị vô hiệu hóa tạm thời, không thể login.

Khi login sẽ nhận lỗi:
```json
{
  "success": false,
  "error": {
    "code": 4005,
    "message": "User account is inactive"
  }
}
```

Để vô hiệu hóa user:
```sql
UPDATE users SET state = 'InActive' WHERE id = 2;
```

### Expired
User đã hết hạn, không thể login.

Khi login sẽ nhận lỗi:
```json
{
  "success": false,
  "error": {
    "code": 4006,
    "message": "User account has expired"
  }
}
```

Để mark user là expired:
```sql
UPDATE users SET state = 'Expired' WHERE id = 3;
```

## Expiration Time Management

### Cách hoạt động

System tự động check expired_time khi user login:
- Nếu `expired_time` là NULL → Không bao giờ hết hạn
- Nếu `current_time > expired_time` → User bị từ chối login

### Ví dụ sử dụng

#### Tạo user với thời hạn 30 ngày:

```sql
INSERT INTO users (name, username, password, state, expired_time)
VALUES (
  'Trial User',
  'trialuser',
  '$2a$10$...', -- hashed password
  'Active',
  DATE_ADD(NOW(), INTERVAL 30 DAY)
);
```

#### Gia hạn thêm 30 ngày:

```sql
UPDATE users
SET expired_time = DATE_ADD(NOW(), INTERVAL 30 DAY)
WHERE id = 5;
```

#### Set user không hết hạn:

```sql
UPDATE users SET expired_time = NULL WHERE id = 1;
```

#### Kiểm tra users sắp hết hạn (7 ngày):

```sql
SELECT id, username, expired_time
FROM users
WHERE expired_time IS NOT NULL
  AND expired_time BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY);
```

## Login Validation Flow

Khi user login, system kiểm tra theo thứ tự:

1. **Username & Password**: Verify credentials
2. **Expiration Check**:
   - Check nếu `state = 'Expired'` → Reject
   - Check nếu `expired_time < NOW()` → Reject
3. **State Check**: Check nếu `state != 'Active'` → Reject
4. **Success**: Generate JWT token

## API Usage

### Tạo user với thời hạn

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Limited User",
    "username": "limiteduser",
    "password": "password123",
    "state": "Active",
    "expired_time": "2024-12-31T23:59:59"
  }'
```

### Update user state

Bạn cần tạo API endpoint riêng cho admin để update user state.

Example implementation:

```javascript
// PUT /api/users/:id/state
router.put('/:id/state',
  authenticate,
  authorize('/users/*'),
  async (req, res, next) => {
    try {
      const { state, expired_time } = req.body;

      await User.update(req.params.id, {
        state,
        expired_time,
        updated_by: req.user.id
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);
```

## Best Practices

### 1. Default State
Luôn tạo user với `state = 'Active'` trừ khi có lý do cụ thể.

### 2. Expiration Notifications
Nên có background job để:
- Gửi email thông báo trước khi hết hạn (7 ngày, 3 ngày, 1 ngày)
- Tự động chuyển `state = 'Expired'` khi `expired_time` qua

### 3. Audit Logging
Log mọi thay đổi về state và expired_time:
```sql
INSERT INTO audit_log (action, user_id, old_value, new_value, changed_by)
VALUES ('state_change', 5, 'Active', 'InActive', 1);
```

### 4. Admin Override
Admin users (với ADMIN role) có thể:
- Xem tất cả users với mọi state
- Thay đổi state của users khác
- Gia hạn hoặc remove expiration

## SQL Queries Hữu ích

### Tìm users đã expired:

```sql
SELECT * FROM users
WHERE state = 'Expired'
   OR (expired_time IS NOT NULL AND expired_time < NOW());
```

### Tìm active users:

```sql
SELECT * FROM users
WHERE state = 'Active'
  AND (expired_time IS NULL OR expired_time > NOW());
```

### Tự động expire users (chạy định kỳ):

```sql
UPDATE users
SET state = 'Expired'
WHERE state != 'Expired'
  AND expired_time IS NOT NULL
  AND expired_time < NOW();
```

### Statistics:

```sql
SELECT
  state,
  COUNT(*) as count,
  COUNT(CASE WHEN expired_time IS NOT NULL THEN 1 END) as with_expiration
FROM users
GROUP BY state;
```

## Error Codes Reference

| Code | Message | HTTP Status | Description |
|------|---------|-------------|-------------|
| 4005 | User account is inactive | 403 | User state is InActive |
| 4006 | User account has expired | 403 | User state is Expired or expired_time passed |

## Testing

### Test inactive user:

```bash
# Set user inactive
mysql -e "UPDATE service_dev.users SET state='InActive' WHERE username='testuser'"

# Try to login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Expected: Error 4005
```

### Test expired user:

```bash
# Set user expired (past date)
mysql -e "UPDATE service_dev.users SET expired_time='2020-01-01' WHERE username='testuser'"

# Try to login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Expected: Error 4006
```

## Migration từ old schema

Nếu bạn đang migrate từ schema cũ không có state/expired_time:

```sql
-- Add columns
ALTER TABLE users
ADD COLUMN state ENUM('Active', 'InActive', 'Expired') DEFAULT 'Active' AFTER role_user_id,
ADD COLUMN expired_time DATETIME NULL AFTER state,
ADD INDEX idx_state (state);

-- Set tất cả existing users thành Active
UPDATE users SET state = 'Active' WHERE state IS NULL;
```
