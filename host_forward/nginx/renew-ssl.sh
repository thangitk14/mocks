#!/bin/bash

# Script to renew SSL certificate for host_forward
# This script can be run manually or added to cron

set -e

echo "Renewing SSL certificate..."

# Check if docker-compose is running
if ! docker-compose ps | grep -q "mock_host_forward_nginx"; then
    echo "Error: nginx-proxy container is not running"
    exit 1
fi

# Renew certificate
docker-compose exec host_forward_nginx certbot renew --quiet --nginx

# Reload nginx
docker-compose exec host_forward_nginx nginx -s reload

echo "SSL certificate renewal completed!"

