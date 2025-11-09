#!/bin/bash

echo "=========================================="
echo "Production Build & Deploy Check"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Check .env.production files
echo "1. Checking .env.production files..."
if [ -f "portal/.env.production" ]; then
    check_pass "portal/.env.production exists"
    if grep -q "^VITE_API_BASE_URL=" portal/.env.production && ! grep -q "^#.*VITE_API_BASE_URL=" portal/.env.production; then
        VALUE=$(grep "^VITE_API_BASE_URL=" portal/.env.production | cut -d'=' -f2)
        if [ -z "$VALUE" ] || [ "$VALUE" = "" ]; then
            check_pass "VITE_API_BASE_URL is empty (will use relative paths)"
        elif [[ "$VALUE" == *"mock_service"* ]]; then
            check_fail "VITE_API_BASE_URL contains Docker internal URL (mock_service)"
        else
            check_warn "VITE_API_BASE_URL is set to: $VALUE"
        fi
    else
        check_pass "VITE_API_BASE_URL not set (will use relative paths)"
    fi
else
    check_fail "portal/.env.production not found"
fi

if [ -f "host_forward/.env.production" ]; then
    check_pass "host_forward/.env.production exists"
    if grep -q "SERVICE_URL=http://mock_service:3000" host_forward/.env.production; then
        check_pass "SERVICE_URL correctly set to Docker service name"
    else
        check_warn "SERVICE_URL might not be set correctly"
    fi
else
    check_fail "host_forward/.env.production not found"
fi

if [ -f "service/.env.production" ]; then
    check_pass "service/.env.production exists"
else
    check_warn "service/.env.production not found (using docker-compose env vars)"
fi

echo ""

# 2. Check Dockerfiles
echo "2. Checking Dockerfiles..."
if grep -q "npm run build -- --mode production" portal/Dockerfile; then
    check_pass "Portal Dockerfile uses production mode"
else
    check_fail "Portal Dockerfile might not use production mode"
fi

if grep -q "ENV NODE_ENV=production" host_forward/Dockerfile; then
    check_pass "Host Forward Dockerfile sets NODE_ENV=production"
else
    check_fail "Host Forward Dockerfile might not set NODE_ENV"
fi

echo ""

# 3. Check code listens on 0.0.0.0
echo "3. Checking code configuration..."
if grep -q "0.0.0.0" host_forward/src/index.js; then
    check_pass "Host Forward listens on 0.0.0.0 in production"
else
    check_fail "Host Forward might not listen on 0.0.0.0"
fi

if grep -q "0.0.0.0" service/src/index.js; then
    check_pass "Backend Service listens on 0.0.0.0 in production"
else
    check_fail "Backend Service might not listen on 0.0.0.0"
fi

if grep -q "server_name _" portal/nginx.conf; then
    check_pass "Nginx accepts all server names"
else
    check_warn "Nginx server_name might be restricted"
fi

echo ""

# 4. Check docker-compose ports
echo "4. Checking docker-compose.yml ports..."
if grep -qE '"0\.0\.0\.0:8910:80"' docker-compose.yml; then
    check_pass "Portal port 8910 is exposed"
else
    check_fail "Portal port 8910 might not be exposed"
fi

if grep -qE '"0\.0\.0\.0:80:4000"' docker-compose.yml; then
    check_pass "Host Forward port 80 is exposed"
else
    check_fail "Host Forward port 80 might not be exposed"
fi

echo ""

# 5. Check if Docker is running
echo "5. Checking Docker..."
if command -v docker &> /dev/null; then
    check_pass "Docker is installed"
    if docker ps &> /dev/null; then
        check_pass "Docker daemon is running"
    else
        check_fail "Docker daemon is not running"
    fi
else
    check_fail "Docker is not installed"
fi

if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    check_pass "Docker Compose is available"
else
    check_fail "Docker Compose is not available"
fi

echo ""

# 6. Check firewall (if available)
echo "6. Checking firewall..."
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "80/tcp.*ALLOW"; then
        check_pass "Port 80 (Host Forward) is allowed in UFW"
    else
        check_warn "Port 80 might not be allowed in UFW"
    fi
    if ufw status | grep -q "8910/tcp.*ALLOW"; then
        check_pass "Port 8910 (Portal) is allowed in UFW"
    else
        check_warn "Port 8910 might not be allowed in UFW"
    fi
elif command -v firewall-cmd &> /dev/null; then
    if firewall-cmd --list-ports | grep -q "80/tcp"; then
        check_pass "Port 80 (Host Forward) is allowed in firewalld"
    else
        check_warn "Port 80 might not be allowed in firewalld"
    fi
    if firewall-cmd --list-ports | grep -q "8910/tcp"; then
        check_pass "Port 8910 (Portal) is allowed in firewalld"
    else
        check_warn "Port 8910 might not be allowed in firewalld"
    fi
else
    check_warn "Firewall tool not found, please check manually"
fi

echo ""
echo "=========================================="
echo "Check complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Fix any issues marked with ✗"
echo "2. Review warnings marked with ⚠"
echo "3. Run: docker-compose build --no-cache"
echo "4. Run: docker-compose up -d"
echo "5. Test: curl http://localhost:8910/health"
echo "6. Test: curl http://localhost/health"

