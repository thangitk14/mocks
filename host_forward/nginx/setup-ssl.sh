#!/bin/bash

# Script to setup SSL certificate for host_forward using certbot
# Usage: ./setup-ssl.sh <domain-name> <email>

set -e

DOMAIN_NAME=${1:-${HOST_FORWARD_DOMAIN}}
EMAIL=${2:-${CERTBOT_EMAIL:-admin@${DOMAIN_NAME}}}

if [ -z "$DOMAIN_NAME" ]; then
    echo "Error: Domain name is required"
    echo "Usage: ./setup-ssl.sh <domain-name> [email]"
    echo "   or set HOST_FORWARD_DOMAIN environment variable"
    exit 1
fi

echo "Setting up SSL certificate for domain: $DOMAIN_NAME"
echo "Email: $EMAIL"

# Check if docker-compose is running
if ! docker-compose ps | grep -q "mock_host_forward_nginx"; then
    echo "Error: nginx-proxy container is not running"
    echo "Please start the services first: docker-compose up -d"
    exit 1
fi

# Request certificate
echo "Requesting SSL certificate..."
docker-compose exec host_forward_nginx certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d "$DOMAIN_NAME" \
    -d "www.$DOMAIN_NAME"

# Reload nginx
echo "Reloading nginx..."
docker-compose exec host_forward_nginx nginx -s reload

echo "SSL certificate setup completed!"
echo "Your site should now be accessible via HTTPS: https://$DOMAIN_NAME"

