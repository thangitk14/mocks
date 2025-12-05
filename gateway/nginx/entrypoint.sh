#!/bin/sh

# Don't exit on error - we want to handle errors gracefully
set +e

# Replace environment variables in nginx config template
echo "Starting nginx with HTTP-only configuration..."
envsubst '${HOST_FORWARD_DOMAIN} ${PORTAL_DOMAIN} ${SERVICE_DOMAIN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Test nginx config
nginx -t || {
    echo "Nginx config test failed!"
    exit 1
}

echo "Nginx configuration loaded successfully. Starting nginx..."

# Keep nginx running in foreground
exec nginx -g "daemon off;"
