# Host Forward Service

Service để forward các API requests từ client (mobile) đến các domain khác nhau dựa trên mapping domain configuration từ service.

## Features

- Forward requests theo mapping domain configuration
- Support tất cả HTTP methods: GET, POST, PUT, DELETE, PATCH
- Tự động log requests vào service
- Tự động refresh configuration mỗi 30 giây
- Generate cURL command từ requests

## Installation

```bash
yarn install
```

## Configuration

Tạo file `.env.developer` với các biến:

```env
PORT=4000
SERVICE_URL=http://localhost:3000
NODE_ENV=developer
```

## Usage

### Development

```bash
yarn dev
```

### Production

```bash
yarn start
```

## How it works

1. Service lấy mapping domain configuration từ `SERVICE_URL/api/config/mappingDomain`
2. Khi client gọi API đến HostForward với path `/test/*`, service sẽ:
   - Tìm mapping domain có path matching
   - Forward request đến `forward_domain` tương ứng
   - Log request vào service API
   - Trả về response từ forward domain

## Example

Nếu có mapping domain:
- path: `/test`
- forward_domain: `https://api.example.com`

Khi client gọi: `POST http://hostforward:4000/test/users`

Service sẽ forward đến: `POST https://api.example.com/test/users`

