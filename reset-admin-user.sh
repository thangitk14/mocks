#!/bin/bash

# Script to reset admin user to default credentials
# Username: admin
# Password: Ttct@835!!

set -e

echo "=========================================="
echo "Resetting Admin User to Default"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get database credentials from docker compose or use defaults
DB_NAME="${DB_NAME:-service_dev}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-Ttct@835!!}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"

echo -e "${YELLOW}Database Configuration:${NC}"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Check if MySQL container is running
if ! docker compose ps | grep -q "mock_service_mysql"; then
    echo -e "${RED}MySQL container is not running.${NC}"
    echo "Please start MySQL first: docker compose up -d mock_mysql"
    exit 1
fi

echo -e "${YELLOW}Resetting admin user...${NC}"

# Reset admin user password and state
# Password hash for 'Ttct@835!!': $2a$10$tAjbvG5/Z9Ts149obxmokeDTD3MBQ79jGHBDJH/nHCiiuDJvRmWFu
ADMIN_PASSWORD_HASH='$2a$10$tAjbvG5/Z9Ts149obxmokeDTD3MBQ79jGHBDJH/nHCiiuDJvRmWFu'

docker compose exec -T mock_mysql mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" <<EOF
-- Update or insert admin user
INSERT INTO users (id, name, username, password, created_by, updated_by, state, expired_time)
VALUES (
  1,
  'System Administrator',
  'admin',
  '${ADMIN_PASSWORD_HASH}',
  0,
  0,
  'Active',
  NULL
)
ON DUPLICATE KEY UPDATE
  name = 'System Administrator',
  username = 'admin',
  password = '${ADMIN_PASSWORD_HASH}',
  updated_by = 0,
  state = 'Active',
  expired_time = NULL;

-- Delete existing role assignments for admin user
DELETE FROM role_user WHERE user_id = 1;

-- Assign ADMIN role to admin user
INSERT INTO role_user (user_id, role_id)
SELECT 1, id FROM roles WHERE code = 'ADMIN' LIMIT 1;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Admin user reset successfully!${NC}"
    echo ""
    echo -e "${GREEN}Login credentials:${NC}"
    echo "  Username: admin"
    echo "  Password: Ttct@835!!"
    echo ""
    echo -e "${YELLOW}You can now login with these credentials.${NC}"
else
    echo -e "${RED}✗ Failed to reset admin user${NC}"
    exit 1
fi

