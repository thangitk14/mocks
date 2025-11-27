# Service Logs API - cURL Examples

## Base URL
```
http://localhost:10000
```

---

## 1. Health Check

```bash
curl -X GET "http://localhost:10000/health" \
  -H "Content-Type: application/json"
```

---

## 2. POST /api/logs - Store List of Logs

```bash
curl -X POST "http://localhost:10000/api/logs" \
  -H "Content-Type: application/json" \
  -d '{
  "logs": [
    {
      "id": "log_1234567890abcdef",
      "userId": "user_abc123",
      "sessionId": "sess_xyz789_1701234567",
      "deviceId": "browser_fingerprint_9a8b7c6d5e4f",
      "deviceModel": "Chrome",
      "deviceVersion": "120.0.6099.109",
      "osName": "Windows",
      "osVersion": "10",
      "appVersion": "2.1.5",
      "environment": "production",
      "logLevel": "ERROR",
      "logSource": "api",
      "logCategory": "payment",
      "logContent": "Payment processing failed: Gateway timeout after 30s",
      "errorCode": "PAY_GATEWAY_TIMEOUT",
      "stackTrace": "Error: Gateway timeout\n    at PaymentService.process (payment.js:145:15)\n    at async CheckoutPage.handleSubmit (checkout.js:89:5)",
      "logIndex": "ERROR",
      "url": "https://example.com/checkout",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "ipAddress": "123.45.67.89",
      "networkType": "wifi",
      "screenResolution": "1920x1080",
      "viewport": "1366x768",
      "timestamp": 1701234567890,
      "createdAt": "20231129143247890",
      "tags": [
        "payment",
        "critical",
        "checkout"
      ],
      "metadata": {
        "orderId": "ORD_12345",
        "amount": 150000,
        "paymentMethod": "credit_card",
        "attemptCount": 3
      },
      "performance": {
        "memoryUsage": 125.5,
        "pageLoadTime": 2340,
        "apiResponseTime": 30120
      },
      "previousLogId": "log_1234567890abcdee",
      "isResolved": false
    },
    {
      "id": "log_9876543210fedcba",
      "userId": "user_def456",
      "sessionId": "sess_abc123_1701234568",
      "deviceId": "mobile_ios_1a2b3c4d5e6f",
      "deviceModel": "iPhone",
      "deviceVersion": "17.2.1",
      "osName": "iOS",
      "osVersion": "17.2.1",
      "appVersion": "2.1.5",
      "environment": "production",
      "logLevel": "WARN",
      "logSource": "mobile",
      "logCategory": "authentication",
      "logContent": "Failed login attempt detected",
      "errorCode": "AUTH_FAILED_ATTEMPT",
      "stackTrace": null,
      "logIndex": "WARN",
      "url": "https://example.com/login",
      "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X)",
      "ipAddress": "98.76.54.32",
      "networkType": "4g",
      "screenResolution": "390x844",
      "viewport": "390x844",
      "timestamp": 1701234568900,
      "createdAt": "20231129143256890",
      "tags": [
        "auth",
        "security",
        "login"
      ],
      "metadata": {
        "attemptCount": 2,
        "lastAttemptTime": "2023-11-29T14:32:56Z"
      },
      "performance": {
        "memoryUsage": 45.2,
        "pageLoadTime": 1200,
        "apiResponseTime": 850
      },
      "previousLogId": null,
      "isResolved": false
    }
  ]
}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inserted": 2,
    "total": 2
  }
}
```

---

## 3. POST /api/logs/csv - Upload CSV File

### Create Sample CSV File

```bash
cat > sample_logs.csv << 'EOF'
id,userId,sessionId,deviceId,deviceModel,deviceVersion,osName,osVersion,appVersion,environment,logLevel,logSource,logCategory,logContent,errorCode,stackTrace,logIndex,url,userAgent,ipAddress,networkType,screenResolution,viewport,timestamp,createdAt,tags,metadata,performance,previousLogId,isResolved
log_csv_001,user_csv_001,sess_csv_001,device_csv_001,Chrome,120.0.6099.109,Windows,10,2.1.5,production,ERROR,api,payment,Payment failed: Invalid card number,PAY_INVALID_CARD,"Error: Invalid card
    at PaymentService.validate (payment.js:50:10)",ERROR,https://example.com/payment,Mozilla/5.0,111.222.333.444,wifi,1920x1080,1366x768,1701234570000,20231129143300000,"[""payment"",""error""]","{""orderId"":""ORD_99999"",""amount"":50000}",{""memoryUsage"":110.5,""pageLoadTime"":2000,""apiResponseTime"":5000},,false
log_csv_002,user_csv_002,sess_csv_002,device_csv_002,Safari,17.2,iOS,17.2.1,2.1.5,production,WARN,mobile,network,Slow network connection detected,NET_SLOW_CONNECTION,,WARN,https://example.com/app,Mozilla/5.0 iPhone,55.66.77.88,4g,390x844,390x844,1701234571000,20231129143301000,"[""network"",""performance""]","{""connectionType"":""4g"",""speed"":""slow""}",{""memoryUsage"":50.0,""pageLoadTime"":3500,""apiResponseTime"":2500},,false
EOF
```

### Upload CSV File

```bash
curl -X POST "http://localhost:10000/api/logs/csv" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sample_logs.csv"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inserted": 2,
    "total": 2
  }
}
```

---

## 4. GET /api/logs/export - Export All Logs as CSV

```bash
curl -X GET "http://localhost:10000/api/logs/export" \
  -H "Accept: text/csv" \
  -o exported_logs_all.csv
```

---

## 5. GET /api/logs/export - Export Logs Filtered by logSource

```bash
curl -X GET "http://localhost:10000/api/logs/export?logSource=api" \
  -H "Accept: text/csv" \
  -o exported_logs_api.csv
```

---

## 6. GET /api/logs/export - Export Logs with Multiple Filters

```bash
curl -X GET "http://localhost:10000/api/logs/export?logSource=api&logLevel=ERROR&environment=production" \
  -H "Accept: text/csv" \
  -o exported_logs_filtered.csv
```

### Available Query Parameters:
- `logSource` - Filter by log source (e.g., "api", "mobile", "web")
- `logLevel` - Filter by log level (e.g., "ERROR", "WARN", "INFO", "DEBUG", "TRACE")
- `environment` - Filter by environment (e.g., "production", "staging", "development")
- `startDate` - Filter logs from this timestamp (Unix timestamp)
- `endDate` - Filter logs until this timestamp (Unix timestamp)
- `limit` - Limit number of results

---

## Single Log Example (Minimal Required Fields)

```bash
curl -X POST "http://localhost:10000/api/logs" \
  -H "Content-Type: application/json" \
  -d '{
  "logs": [
    {
      "id": "log_minimal_001",
      "logLevel": "ERROR",
      "logSource": "api",
      "logContent": "Sample error message",
      "timestamp": 1701234567890,
      "createdAt": "20231129143247890"
    }
  ]
}'
```

---

## Notes

- All fields except `id` are optional in the log model
- JSON fields (`tags`, `metadata`, `performance`) should be provided as JSON objects/arrays
- `isResolved` should be boolean (true/false)
- `timestamp` should be Unix timestamp in milliseconds
- CSV files should have headers matching the log model fields
- CSV files are limited to 10MB

