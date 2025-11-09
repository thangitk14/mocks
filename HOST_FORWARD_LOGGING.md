# Host Forward Logging Guide

## Tổng quan

Host Forward đã được cấu hình với logging chi tiết step-by-step cho mỗi request từ client. Tất cả logs hiển thị trên production để dễ dàng debug và monitor.

## Request ID

Mỗi request được gán một **Request ID** duy nhất để dễ dàng trace:
- Format: `[timestamp]-[random]`
- Ví dụ: `[1704067200000-abc123xyz]`
- Request ID được sử dụng trong tất cả logs của request đó

## Logging Steps

### STEP 1: Incoming Request
```
[requestId] [STEP 1] Incoming Request
  Method: GET/POST/PUT/DELETE
  Path: /vietbank_qa/api/test
  Client IP: 192.168.1.100
  Headers: {...}
  Body: {...} (nếu có)
  Query: {...} (nếu có)
```

### STEP 2: Finding Mapping Domain
```
[requestId] [STEP 2] Finding Mapping Domain
  Looking for path: /vietbank_qa/api/test
  ✅ Mapping found
    Domain ID: 1
    Project: VietBank QA
    Path: /vietbank_qa
    Forward Domain: https://api.vietbank.com
    Forward State: AllApi
```

**Hoặc nếu không tìm thấy:**
```
[requestId] [STEP 2] ❌ No mapping found or forward_state is NoneApi
  Domain: null
[requestId] [RESPONSE] 404 - No mapping found
```

### STEP 3: Building Forward URL
```
[requestId] [STEP 3] Building Forward URL
  Original Path: /vietbank_qa/api/test
  Mapped Path: /vietbank_qa
  Forward Path: /api/test
  Forward URL: https://api.vietbank.com/api/test
```

### STEP 4: Checking Mock Response
```
[requestId] [STEP 4] Checking Mock Response
  Service URL: http://fw.thangvnnc.io.vn:3000
  Domain ID: 1
  Relative Path: /api/test
  Method: GET
  Mock check response status: 200
```

**Nếu có mock response:**
```
[requestId] [STEP 4] ✅ Mock response found (Active)
  Mock ID: 5
  Status Code: 200
  Delay: 1000ms
[requestId] [STEP 4] Applying delay: 1000ms
[requestId] [STEP 4] Total duration: 1200ms
[requestId] [RESPONSE] Returning mock response
  Status: 200
  Headers: {...}
[requestId] [COMPLETE] Mock response sent (1200ms)
```

**Nếu không có mock:**
```
[requestId] [STEP 4] ❌ No active mock response found
```

### STEP 5: Preparing Forward Request
```
[requestId] [STEP 5] Preparing Forward Request
  Forward URL: https://api.vietbank.com/api/test
  Method: GET
  Headers: {...}
  Query Params: {...} (nếu có)
  Request Body: {...} (nếu có)
```

### STEP 6: Forwarding Request
```
[requestId] [STEP 6] Forwarding Request
[requestId] [STEP 6] ✅ Forward response received
  Status: 200
  Forward Duration: 450ms
  Response Headers: {...}
```

### STEP 7: Total Request Duration
```
[requestId] [STEP 7] Total Request Duration: 500ms
```

### STEP 8: Logging Request to Service
```
[requestId] [STEP 8] Logging Request to Service
[LOG] Sending log to http://fw.thangvnnc.io.vn:3000/api/logs for domain_id: 1, method: GET, path: /vietbank_qa/api/test
[LOG] Successfully logged request for domain_id: 1, status: 201
```

### STEP 9: Returning Response to Client
```
[requestId] [STEP 9] Returning Response to Client
  Status: 200
[requestId] [COMPLETE] Request completed successfully (500ms)
[requestId] ========================================
```

## Error Logging

Khi có lỗi xảy ra:
```
[requestId] [ERROR] Forward failed
  Error: Connection timeout
  Stack: Error: Connection timeout
    at ...
  Duration: 30000ms
[requestId] [RESPONSE] Returning error response (500)
[requestId] [COMPLETE] Request failed (30000ms)
[requestId] ========================================
```

## Xem Logs trên Production

### 1. Xem logs real-time
```bash
docker-compose logs -f host_forward
```

### 2. Xem logs của request cụ thể
```bash
docker-compose logs host_forward | grep "\[1704067200000-abc123xyz\]"
```

### 3. Xem logs của step cụ thể
```bash
# Xem tất cả STEP 2 (Finding Mapping)
docker-compose logs host_forward | grep "\[STEP 2\]"

# Xem tất cả errors
docker-compose logs host_forward | grep "\[ERROR\]"

# Xem tất cả completed requests
docker-compose logs host_forward | grep "\[COMPLETE\]"
```

### 4. Xem logs gần đây
```bash
docker-compose logs --tail=100 host_forward
```

### 5. Xem logs với timestamp
```bash
docker-compose logs -f --timestamps host_forward
```

## Log Format

Mỗi log entry có format:
```
[requestId] [STEP X] Description
  Detail 1: value
  Detail 2: value
```

**Ví dụ:**
```
[1704067200000-abc123xyz] [STEP 1] Incoming Request
[1704067200000-abc123xyz]   Method: GET
[1704067200000-abc123xyz]   Path: /vietbank_qa/api/test
[1704067200000-abc123xyz]   Client IP: 192.168.1.100
```

## Log Levels

- **INFO**: Normal flow (STEP 1-9)
- **WARN**: Non-critical issues (mock check failed, etc.)
- **ERROR**: Critical errors (forward failed, etc.)

## Performance Metrics

Logs bao gồm các metrics:
- **Total Duration**: Tổng thời gian xử lý request
- **Forward Duration**: Thời gian forward request đến target
- **Mock Delay**: Thời gian delay nếu có mock response

## Best Practices

1. **Trace request**: Sử dụng Request ID để trace một request cụ thể
2. **Monitor errors**: Filter logs theo `[ERROR]` để tìm lỗi
3. **Performance**: Xem `[STEP 7]` để monitor performance
4. **Debug mapping**: Xem `[STEP 2]` để debug mapping issues
5. **Mock debugging**: Xem `[STEP 4]` để debug mock responses

## Example: Complete Request Flow

```
[1704067200000-abc123xyz] ========================================
[1704067200000-abc123xyz] [STEP 1] Incoming Request
[1704067200000-abc123xyz]   Method: GET
[1704067200000-abc123xyz]   Path: /vietbank_qa/api/test
[1704067200000-abc123xyz]   Client IP: 192.168.1.100
[1704067200000-abc123xyz] [STEP 2] Finding Mapping Domain
[1704067200000-abc123xyz]   Looking for path: /vietbank_qa/api/test
[1704067200000-abc123xyz] [STEP 2] ✅ Mapping found
[1704067200000-abc123xyz]   Domain ID: 1
[1704067200000-abc123xyz]   Project: VietBank QA
[1704067200000-abc123xyz]   Path: /vietbank_qa
[1704067200000-abc123xyz]   Forward Domain: https://api.vietbank.com
[1704067200000-abc123xyz]   Forward State: AllApi
[1704067200000-abc123xyz] [STEP 3] Building Forward URL
[1704067200000-abc123xyz]   Original Path: /vietbank_qa/api/test
[1704067200000-abc123xyz]   Mapped Path: /vietbank_qa
[1704067200000-abc123xyz]   Forward Path: /api/test
[1704067200000-abc123xyz]   Forward URL: https://api.vietbank.com/api/test
[1704067200000-abc123xyz] [STEP 4] Checking Mock Response
[1704067200000-abc123xyz]   Service URL: http://fw.thangvnnc.io.vn:3000
[1704067200000-abc123xyz]   Domain ID: 1
[1704067200000-abc123xyz]   Relative Path: /api/test
[1704067200000-abc123xyz]   Method: GET
[1704067200000-abc123xyz] [STEP 4] ❌ No active mock response found
[1704067200000-abc123xyz] [STEP 5] Preparing Forward Request
[1704067200000-abc123xyz]   Forward URL: https://api.vietbank.com/api/test
[1704067200000-abc123xyz]   Method: GET
[1704067200000-abc123xyz] [STEP 6] Forwarding Request
[1704067200000-abc123xyz] [STEP 6] ✅ Forward response received
[1704067200000-abc123xyz]   Status: 200
[1704067200000-abc123xyz]   Forward Duration: 450ms
[1704067200000-abc123xyz] [STEP 7] Total Request Duration: 500ms
[1704067200000-abc123xyz] [STEP 8] Logging Request to Service
[1704067200000-abc123xyz] [STEP 9] Returning Response to Client
[1704067200000-abc123xyz]   Status: 200
[1704067200000-abc123xyz] [COMPLETE] Request completed successfully (500ms)
[1704067200000-abc123xyz] ========================================
```

## Troubleshooting

### Request không tìm thấy mapping
- Xem `[STEP 2]` để kiểm tra path matching
- Xem `[Config]` logs để xem available mappings

### Request bị timeout
- Xem `[STEP 6]` để kiểm tra forward duration
- Xem `[ERROR]` để xem error details

### Mock response không hoạt động
- Xem `[STEP 4]` để kiểm tra mock check
- Xem mock state và delay

### Log không được gửi đến service
- Xem `[STEP 8]` để kiểm tra log request
- Xem `[LOG]` messages để debug

