#!/bin/bash

# Debug script to check MySQL connection issues
# This script helps identify connection problems: username, password, database name, host permissions

echo "=========================================="
echo "MySQL Connection Debug Script"
echo "=========================================="
echo ""

# Get environment variables from docker-compose or use defaults
DB_HOST=${DB_HOST:-mock_mysql}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-Ttct@835!!}
DB_NAME=${DB_NAME:-service_dev}

echo "1. Checking Environment Variables:"
echo "   DB_HOST: $DB_HOST"
echo "   DB_PORT: $DB_PORT"
echo "   DB_USER: $DB_USER"
echo "   DB_NAME: $DB_NAME"
echo "   DB_PASSWORD: [HIDDEN]"
echo ""

# Check if MySQL container is running
echo "2. Checking MySQL Container Status:"
if docker ps | grep -q mock_service_mysql; then
    echo "   ✓ MySQL container is running"
    MYSQL_CONTAINER=$(docker ps | grep mock_service_mysql | awk '{print $1}')
    echo "   Container ID: $MYSQL_CONTAINER"
else
    echo "   ✗ MySQL container is NOT running"
    echo "   Please start it with: docker compose up -d mock_mysql"
    exit 1
fi
echo ""

# Check MySQL container IP
echo "3. Checking MySQL Container Network:"
MYSQL_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mock_service_mysql)
echo "   MySQL Container IP: $MYSQL_IP"
echo "   Network: mock_service_network"
echo ""

# Check if we can ping MySQL container
echo "4. Testing Network Connectivity:"
if docker exec mock_service_mysql mysqladmin ping -h localhost -uroot -p"$DB_PASSWORD" &>/dev/null; then
    echo "   ✓ MySQL is accepting connections (localhost)"
else
    echo "   ✗ MySQL is NOT accepting connections (localhost)"
fi
echo ""

# Check MySQL users and their allowed hosts
echo "5. Checking MySQL Users and Permissions:"
echo "   Users allowed to connect:"
docker exec -i mock_service_mysql mysql -uroot -p"$DB_PASSWORD" -e "SELECT User, Host FROM mysql.user WHERE User='$DB_USER' OR User='root';" 2>/dev/null || echo "   ✗ Cannot query users (check password)"
echo ""

# Check if database exists
echo "6. Checking Database:"
DB_EXISTS=$(docker exec -i mock_service_mysql mysql -uroot -p"$DB_PASSWORD" -e "SHOW DATABASES LIKE '$DB_NAME';" 2>/dev/null | grep -c "$DB_NAME" || echo "0")
if [ "$DB_EXISTS" -gt 0 ]; then
    echo "   ✓ Database '$DB_NAME' exists"
else
    echo "   ✗ Database '$DB_NAME' does NOT exist"
    echo "   Available databases:"
    docker exec -i mock_service_mysql mysql -uroot -p"$DB_PASSWORD" -e "SHOW DATABASES;" 2>/dev/null || echo "   Cannot list databases"
fi
echo ""

# Test connection from service container
echo "7. Testing Connection from Service Container:"
if docker ps | grep -q mock_service_app; then
    echo "   Testing connection from mock_service_app:"
    docker exec mock_service_app node -e "
        const mysql = require('mysql2');
        const connection = mysql.createConnection({
            host: process.env.DB_HOST || '$DB_HOST',
            port: process.env.DB_PORT || $DB_PORT,
            user: process.env.DB_USER || '$DB_USER',
            password: process.env.DB_PASSWORD || '$DB_PASSWORD',
            database: process.env.DB_NAME || '$DB_NAME'
        });
        connection.connect((err) => {
            if (err) {
                console.error('   ✗ Connection failed:', err.message);
                process.exit(1);
            } else {
                console.log('   ✓ Connection successful!');
                connection.end();
                process.exit(0);
            }
        });
    " 2>&1 || echo "   ✗ Cannot test connection (container may not have mysql2 installed)"
else
    echo "   Service container is not running"
fi
echo ""

# Check MySQL bind-address configuration
echo "8. Checking MySQL Configuration:"
BIND_ADDRESS=$(docker exec mock_service_mysql mysql -uroot -p"$DB_PASSWORD" -e "SHOW VARIABLES LIKE 'bind_address';" 2>/dev/null | grep bind_address | awk '{print $2}' || echo "unknown")
echo "   bind_address: $BIND_ADDRESS"
echo ""

# Summary and recommendations
echo "=========================================="
echo "Summary & Recommendations:"
echo "=========================================="
echo ""

# Check if root@% user exists
ROOT_ANY_HOST=$(docker exec -i mock_service_mysql mysql -uroot -p"$DB_PASSWORD" -e "SELECT COUNT(*) FROM mysql.user WHERE User='root' AND Host='%';" 2>/dev/null | tail -n 1 || echo "0")

if [ "$ROOT_ANY_HOST" -eq "0" ]; then
    echo "⚠ ISSUE FOUND: root@'%' user does not exist"
    echo ""
    echo "Fix by running this command:"
    echo "docker exec -i mock_service_mysql mysql -uroot -p$DB_PASSWORD -e \"CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY '$DB_PASSWORD'; GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION; FLUSH PRIVILEGES;\""
    echo ""
else
    echo "✓ root@'%' user exists"
fi

echo ""
echo "To view detailed MySQL user permissions:"
echo "docker exec -i mock_service_mysql mysql -uroot -p$DB_PASSWORD -e \"SELECT User, Host FROM mysql.user;\""
echo ""
echo "To test connection manually:"
echo "docker exec -it mock_service_mysql mysql -u$DB_USER -p$DB_PASSWORD -h $DB_HOST $DB_NAME"
echo ""



