#!/bin/bash

# Script to rebuild database from scratch
# This will remove all data and recreate the database with init.sql

set -e

echo "=========================================="
echo "Rebuilding Database from Scratch"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker compose is running
if ! docker compose ps | grep -q "mock_service_mysql"; then
    echo -e "${YELLOW}MySQL container is not running. Starting services...${NC}"
    docker compose up -d mock_mysql
    echo "Waiting for MySQL to be ready..."
    sleep 10
fi

# Get database credentials from docker compose or use defaults
DB_NAME="${DB_NAME:-service_dev}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-Test@123}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"

echo -e "${YELLOW}Database Configuration:${NC}"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Confirm action
read -p "This will DELETE ALL DATA in database '$DB_NAME'. Are you sure? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${RED}Aborted.${NC}"
    exit 1
fi

echo -e "${YELLOW}Stopping services that depend on database...${NC}"
docker compose stop mock_service host_forward || true

echo -e "${YELLOW}Removing MySQL volume to start fresh...${NC}"
docker compose down -v mock_mysql || true

echo -e "${YELLOW}Starting MySQL container...${NC}"
docker compose up -d mock_mysql

echo -e "${YELLOW}Waiting for MySQL to be ready...${NC}"
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker compose exec -T mock_mysql mysqladmin ping -h localhost -u root -p"$DB_PASSWORD" --silent 2>/dev/null; then
        echo -e "${GREEN}MySQL is ready!${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo "Waiting for MySQL... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}MySQL failed to start within timeout.${NC}"
    exit 1
fi

# Wait a bit more for init.sql to run
echo -e "${YELLOW}Waiting for database initialization to complete...${NC}"
sleep 5

# Verify tables were created
echo -e "${YELLOW}Verifying database initialization...${NC}"
tables=$(docker compose exec -T mock_mysql mysql -u root -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null | grep -v "Tables_in" | wc -l | tr -d ' ')

if [ "$tables" -ge "5" ]; then
    echo -e "${GREEN}✓ Database initialized successfully!${NC}"
    echo -e "${GREEN}✓ Found $tables tables${NC}"
    
    # Show tables
    echo -e "${YELLOW}Created tables:${NC}"
    docker compose exec -T mock_mysql mysql -u root -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null | grep -v "Tables_in"
    
    # Verify admin user
    echo -e "${YELLOW}Verifying admin user...${NC}"
    admin_exists=$(docker compose exec -T mock_mysql mysql -u root -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) FROM users WHERE username='admin';" 2>/dev/null | tail -n 1 | tr -d ' ')
    
    if [ "$admin_exists" -eq "1" ]; then
        echo -e "${GREEN}✓ Admin user created${NC}"
        echo -e "${GREEN}  Username: admin${NC}"
        echo -e "${GREEN}  Password: Test@123${NC}"
    else
        echo -e "${RED}✗ Admin user not found${NC}"
    fi
    
    # Verify roles
    echo -e "${YELLOW}Verifying roles...${NC}"
    role_count=$(docker compose exec -T mock_mysql mysql -u root -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) FROM roles;" 2>/dev/null | tail -n 1 | tr -d ' ')
    
    if [ "$role_count" -ge "4" ]; then
        echo -e "${GREEN}✓ Default roles created ($role_count roles)${NC}"
    else
        echo -e "${YELLOW}⚠ Expected 4 roles, found $role_count${NC}"
    fi
    
else
    echo -e "${RED}✗ Database initialization may have failed. Only $tables tables found.${NC}"
    echo -e "${YELLOW}Check MySQL logs:${NC}"
    echo "  docker compose logs mock_mysql"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================="
echo -e "Database Rebuild Complete!"
echo -e "==========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Start all services: docker compose up -d"
echo "  2. Login to portal: http://fw.thangvnnc.io.vn:8910"
echo "     Username: admin"
echo "     Password: Test@123"
echo ""

