# Changelog

## [1.1.0] - User State Management & Default Admin

### Added

#### Database Schema Changes
- **state** field in users table: ENUM('Active', 'InActive', 'Expired')
  - Default: 'Active'
  - Manages user account state
- **expired_time** field in users table: DATETIME (nullable)
  - Manages user account expiration
  - NULL = no expiration
- Index on state field for better query performance

#### Default Admin User
- Automatically created on database initialization
- Credentials:
  - Username: `admin`
  - Password: `Test@123`
  - State: Active
  - Expired time: NULL (no expiration)
- Assigned ADMIN role with full access (path: /*)

#### User Model Enhancements
- `User.create()` now accepts `state` and `expired_time` parameters
- `User.update()` now supports updating `state` and `expired_time`
- `User.findById()` now returns `state` and `expired_time`
- New helper methods:
  - `User.isUserActive(user)`: Check if user state is Active
  - `User.isUserExpired(user)`: Check if user is expired (by state or expired_time)
  - `User.canUserLogin(user)`: Validate if user can login

#### Constants
- `USER_STATES` constant file with state values:
  - `ACTIVE`: 'Active'
  - `INACTIVE`: 'InActive'
  - `EXPIRED`: 'Expired'

#### Error Codes
- `4005 - USER_INACTIVE`: User account is inactive (403 Forbidden)
- `4006 - USER_EXPIRED`: User account has expired (403 Forbidden)

#### Login Validation
- Login now validates user state before generating token:
  1. Check if user is expired (by state or expired_time)
  2. Check if user is active
  3. Returns appropriate error code if validation fails

#### Documentation
- `docs/USER_STATE_MANAGEMENT.md`: Comprehensive guide on managing user states
- Updated `README.md` with default admin credentials
- Updated `QUICKSTART.md` with admin login example
- Updated database schema documentation

### Modified

#### Database Initialization
- `scripts/init.sql`: Updated with new fields and default admin user
- `scripts/initDatabase.js`: Updated to create admin user with bcrypt password

#### Authentication Controller
- `authController.login()`: Added state and expiration validation

### Files Changed
```
src/
├── constants/
│   └── userStates.js (NEW)
├── controllers/
│   └── authController.js (MODIFIED)
├── models/
│   └── User.js (MODIFIED)
└── utils/
    └── errorCodes.js (MODIFIED)

scripts/
├── init.sql (MODIFIED)
└── initDatabase.js (MODIFIED)

docs/
└── USER_STATE_MANAGEMENT.md (NEW)

README.md (MODIFIED)
QUICKSTART.md (MODIFIED)
CHANGELOG.md (NEW)
```

### Database Migration

If you have an existing database, run this migration:

```sql
-- Add new columns
ALTER TABLE users
ADD COLUMN state ENUM('Active', 'InActive', 'Expired') DEFAULT 'Active' AFTER role_user_id,
ADD COLUMN expired_time DATETIME NULL AFTER state,
ADD INDEX idx_state (state);

-- Create admin user (if not exists)
INSERT IGNORE INTO users (id, name, username, password, created_by, updated_by, state, expired_time)
VALUES (
  1,
  'System Administrator',
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- Test@123
  0,
  0,
  'Active',
  NULL
);

-- Assign ADMIN role to admin user
INSERT IGNORE INTO role_user (user_id, role_id)
SELECT 1, id FROM roles WHERE code = 'ADMIN' LIMIT 1;
```

### Breaking Changes
None - All changes are backward compatible. Existing users will have state='Active' by default.

### Testing

Login with admin credentials:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Test@123"
  }'
```

Test inactive user:
```bash
# Set user inactive
UPDATE users SET state='InActive' WHERE id=2;

# Try login - should get error 4005
```

Test expired user:
```bash
# Set expired_time in past
UPDATE users SET expired_time='2020-01-01' WHERE id=2;

# Try login - should get error 4006
```

---

## [1.0.0] - Initial Release

### Added
- Express.js server with Node.js 20+
- MySQL database integration
- JWT authentication
- Role-based authorization with path permissions
- User, Role, and RoleUser models
- Professional error handling with error codes
- Docker and docker-compose setup
- Environment configuration (.env.developer, .env.production)
- API endpoints: register, login, profile
- Database initialization scripts
- Comprehensive documentation
