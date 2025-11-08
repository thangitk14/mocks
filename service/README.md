# Authentication & Authorization Service

A Node.js service with Express, MySQL, JWT authentication, and role-based authorization.

## Requirements

### Option 1: Docker (Khuyến nghị)
- Docker Desktop

### Option 2: Local Development
- Node.js 20+
- MySQL 8.0+

## Features

- User registration and login
- JWT-based authentication
- Role-based authorization with path permissions
- Professional error handling with error codes
- MySQL database with proper relationships
- Environment-based configuration

## Quick Start với Docker (Khuyến nghị)

```bash
cd service
docker-compose up
```

Xong! Service sẽ chạy tại `http://localhost:3000`

Database sẽ tự động được khởi tạo với tables và default roles.

**Xem hướng dẫn chi tiết:** [DOCKER.md](DOCKER.md)

## Installation (Local Development)

1. Install dependencies:
```bash
cd service
npm install
```

2. Set up the database:
```bash
# Make sure MySQL is running with credentials: root/Test@123
node scripts/initDatabase.js
```

This will create:
- Database tables (users, roles, role_user)
- Default roles:
  - ADMIN: Full access (path: /*)
  - CONFIG_MANAGER: Configuration access (path: /config/*)
  - USER_MANAGER: User management access (path: /users/*)
  - VIEWER: View access (path: /view/*)

## Running the Service

### Development mode:
```bash
npm run dev
```

### Production mode:
```bash
npm run dev:production
# or
npm start
```

## API Endpoints

### Authentication

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "username": "johndoe",
  "password": "password123",
  "role_user_id": 1
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "username": "johndoe",
      "role_user_id": 1
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Get Profile (Protected)
```
GET /api/auth/profile
Authorization: Bearer <token>
```

### Health Check
```
GET /health
```

## Database Schema

### Users Table
- id: INT (Primary Key)
- name: VARCHAR(255)
- username: VARCHAR(255) UNIQUE
- password: VARCHAR(255) (hashed)
- created_by: INT
- updated_by: INT
- role_user_id: INT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

### Roles Table
- id: INT (Primary Key)
- code: VARCHAR(100) UNIQUE
- name: VARCHAR(255)
- path: VARCHAR(255) - Used for path-based authorization
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

### RoleUser Table
- id: INT (Primary Key)
- user_id: INT (Foreign Key)
- role_id: INT (Foreign Key)
- created_at: TIMESTAMP

## Authorization

The service uses path-based authorization. Each role has a `path` field that supports wildcards:

- `/config/*` - Grants access to all /config routes
- `/users/*` - Grants access to all /users routes
- `/*` - Grants access to all routes (admin)

To protect a route:
```javascript
const authenticate = require('./middleware/auth');
const authorize = require('./middleware/authorize');

router.get('/config/settings',
  authenticate,
  authorize('/config/settings'),
  controller.getSettings
);
```

## Error Codes

The API uses standardized error codes:

- 1000-1999: General errors
- 2000-2999: Authentication errors
- 3000-3999: Authorization errors
- 4000-4999: User errors
- 5000-5999: Role errors
- 6000-6999: Database errors

Example error response:
```json
{
  "success": false,
  "error": {
    "code": 2000,
    "message": "Invalid username or password"
  }
}
```

## Configuration

Edit `.env.developer` or `.env.production` to configure:

- Server port
- Database connection
- JWT secret and expiration
- CORS settings

## Project Structure

```
service/
├── src/
│   ├── config/
│   │   ├── config.js
│   │   └── database.js
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── authorize.js
│   │   ├── errorHandler.js
│   │   └── validate.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Role.js
│   │   └── RoleUser.js
│   ├── routes/
│   │   └── authRoutes.js
│   ├── utils/
│   │   ├── AppError.js
│   │   ├── errorCodes.js
│   │   └── jwt.js
│   └── index.js
├── scripts/
│   └── initDatabase.js
├── .env.developer
├── .env.production
├── .gitignore
├── nodemon.json
├── package.json
└── README.md
```
