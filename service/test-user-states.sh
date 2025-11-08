#!/bin/bash

# Test script for User State Management
# Usage: chmod +x test-user-states.sh && ./test-user-states.sh

API_URL="http://localhost:3000"
MYSQL_CMD="docker exec -i service_mysql mysql -uroot -pTest@123 service_dev"

echo "======================================"
echo "User State Management Test Script"
echo "======================================"
echo ""

# Test 1: Login with default admin
echo "Test 1: Login with default admin user"
echo "--------------------------------------"
curl -X POST ${API_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Test@123"
  }' | jq .

echo -e "\n\n"

# Test 2: Create a test user
echo "Test 2: Create test user"
echo "--------------------------------------"
REGISTER_RESPONSE=$(curl -s -X POST ${API_URL}/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "username": "testuser",
    "password": "password123"
  }')

echo $REGISTER_RESPONSE | jq .
TEST_USER_ID=$(echo $REGISTER_RESPONSE | jq -r '.data.user.id')

echo -e "\n\n"

# Test 3: Login with test user (should work - Active state)
echo "Test 3: Login with test user (Active state)"
echo "--------------------------------------"
curl -X POST ${API_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }' | jq .

echo -e "\n\n"

# Test 4: Set user to InActive
echo "Test 4: Set user to InActive state"
echo "--------------------------------------"
echo "UPDATE users SET state='InActive' WHERE id=${TEST_USER_ID};" | $MYSQL_CMD
echo "User ${TEST_USER_ID} set to InActive"

echo -e "\n"

# Test 5: Try to login with inactive user (should fail with error 4005)
echo "Test 5: Login with InActive user (should fail)"
echo "--------------------------------------"
curl -X POST ${API_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }' | jq .

echo -e "\n\n"

# Test 6: Set user back to Active but with past expired_time
echo "Test 6: Set user to Active but expired"
echo "--------------------------------------"
echo "UPDATE users SET state='Active', expired_time='2020-01-01 00:00:00' WHERE id=${TEST_USER_ID};" | $MYSQL_CMD
echo "User ${TEST_USER_ID} set to Active with past expired_time"

echo -e "\n"

# Test 7: Try to login with expired user (should fail with error 4006)
echo "Test 7: Login with expired user (should fail)"
echo "--------------------------------------"
curl -X POST ${API_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }' | jq .

echo -e "\n\n"

# Test 8: Set user to Active with future expired_time
echo "Test 8: Set user to Active with future expiration"
echo "--------------------------------------"
FUTURE_DATE=$(date -u -d "+30 days" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || date -u -v+30d "+%Y-%m-%d %H:%M:%S")
echo "UPDATE users SET state='Active', expired_time='${FUTURE_DATE}' WHERE id=${TEST_USER_ID};" | $MYSQL_CMD
echo "User ${TEST_USER_ID} set to Active, expires: ${FUTURE_DATE}"

echo -e "\n"

# Test 9: Login should work now
echo "Test 9: Login with valid active user (should succeed)"
echo "--------------------------------------"
curl -X POST ${API_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }' | jq .

echo -e "\n\n"

# Test 10: Check user states in database
echo "Test 10: Check all users in database"
echo "--------------------------------------"
echo "SELECT id, username, state, expired_time FROM users;" | $MYSQL_CMD

echo -e "\n"

# Cleanup
echo "======================================"
echo "Cleanup: Removing test user"
echo "======================================"
echo "DELETE FROM users WHERE username='testuser';" | $MYSQL_CMD
echo "Test user removed"

echo -e "\n"
echo "======================================"
echo "All tests completed!"
echo "======================================"
