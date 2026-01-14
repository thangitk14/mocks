#!/bin/bash

# Quick script to check MySQL credentials and connection details

DB_HOST=${DB_HOST:-mock_mysql}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-Ttct@835!!}
DB_NAME=${DB_NAME:-service_dev}

echo "=========================================="
echo "MySQL Credentials Check"
echo "=========================================="
echo ""

echo "1. Environment Variables (from service container):"
if docker ps | grep -q mock_service_app; then
    echo "   From mock_service_app container:"
    docker exec mock_service_app printenv | grep -E "^DB_" | sed 's/^/   /'
else
    echo "   Service container not running, using defaults:"
    echo "   DB_HOST=$DB_HOST"
    echo "   DB_PORT=$DB_PORT"
    echo "   DB_USER=$DB_USER"
    echo "   DB_NAME=$DB_NAME"
    echo "   DB_PASSWORD=[HIDDEN]"
fi
echo ""

echo "2. Testing MySQL Credentials:"
echo "   Testing username: $DB_USER"
echo "   Testing password: [HIDDEN]"
echo ""

# Test 1: Check if we can connect with root@localhost
echo "   Test 1: root@localhost connection"
if docker exec mock_service_mysql mysql -uroot -p"$DB_PASSWORD" -e "SELECT 1;" &>/dev/null; then
    echo "   ✓ root@localhost: SUCCESS"
else
    echo "   ✗ root@localhost: FAILED (wrong password or MySQL issue)"
fi
echo ""

# Test 2: Check if user can connect from any host
echo "   Test 2: root@'%' connection (from Docker network)"
ROOT_ANY_EXISTS=$(docker exec -i mock_service_mysql mysql -uroot -p"$DB_PASSWORD" -e "SELECT COUNT(*) FROM mysql.user WHERE User='root' AND Host='%';" 2>/dev/null | tail -n 1 || echo "0")
if [ "$ROOT_ANY_EXISTS" -gt "0" ]; then
    echo "   ✓ root@'%' user exists"
else
    echo "   ✗ root@'%' user does NOT exist (this is the problem!)"
fi
echo ""

# Test 3: Check database exists
echo "   Test 3: Database '$DB_NAME' exists"
DB_EXISTS=$(docker exec -i mock_service_mysql mysql -uroot -p"$DB_PASSWORD" -e "SHOW DATABASES LIKE '$DB_NAME';" 2>/dev/null | grep -c "$DB_NAME" || echo "0")
if [ "$DB_EXISTS" -gt 0 ]; then
    echo "   ✓ Database exists"
else
    echo "   ✗ Database does NOT exist"
fi
echo ""

# Test 4: Check user permissions
echo "   Test 4: User permissions for $DB_USER"
docker exec -i mock_service_mysql mysql -uroot -p"$DB_PASSWORD" -e "SHOW GRANTS FOR '$DB_USER'@'%';" 2>/dev/null || echo "   ✗ Cannot show grants (user may not exist for % host)"
echo ""

echo "3. All MySQL Users:"
docker exec -i mock_service_mysql mysql -uroot -p"$DB_PASSWORD" -e "SELECT User, Host, plugin FROM mysql.user WHERE User='root' OR User='$DB_USER';" 2>/dev/null || echo "   Cannot query users"
echo ""

echo "4. Quick Fix Command:"
echo "   Run this to fix the connection issue:"
echo ""
echo "   docker exec -i mock_service_mysql mysql -uroot -p$DB_PASSWORD <<EOF"
echo "   CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY '$DB_PASSWORD';"
echo "   GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;"
echo "   FLUSH PRIVILEGES;"
echo "   EOF"
echo ""


