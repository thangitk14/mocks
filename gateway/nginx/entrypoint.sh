#!/bin/sh

# Don't exit on error - we want to handle errors gracefully
set +e

# Create directory for ACME challenge
mkdir -p /var/www/certbot

# Function to request certificate for a domain
request_certificate() {
    local DOMAIN=$1
    
    echo "Requesting SSL certificate for ${DOMAIN}..."
    
    # Try to get certificate for both domains
    if certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email ${CERTBOT_EMAIL:-admin@${DOMAIN}} \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        -d ${DOMAIN} \
        -d www.${DOMAIN} 2>&1; then
        echo "Certificate generated successfully for ${DOMAIN} and www.${DOMAIN}"
    else
        echo "Failed to get certificate for both domains. Trying main domain only..."
        # Try main domain only (in case www has rate limit issues)
        if certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email ${CERTBOT_EMAIL:-admin@${DOMAIN}} \
            --agree-tos \
            --no-eff-email \
            --non-interactive \
            -d ${DOMAIN} 2>&1; then
            echo "Certificate generated successfully for ${DOMAIN} only"
        else
            echo "Certificate generation failed for ${DOMAIN}"
        fi
    fi
}

# Check if certificates exist for all domains
HOST_FORWARD_CERT_EXISTS=false
PORTAL_CERT_EXISTS=false
SERVICE_CERT_EXISTS=false
GITLAB_CERT_EXISTS=false

if [ -f "/etc/letsencrypt/live/${HOST_FORWARD_DOMAIN}/fullchain.pem" ]; then
    HOST_FORWARD_CERT_EXISTS=true
    echo "Certificate found for ${HOST_FORWARD_DOMAIN}"
fi

if [ -f "/etc/letsencrypt/live/${PORTAL_DOMAIN}/fullchain.pem" ]; then
    PORTAL_CERT_EXISTS=true
    echo "Certificate found for ${PORTAL_DOMAIN}"
fi

if [ -f "/etc/letsencrypt/live/${SERVICE_DOMAIN}/fullchain.pem" ]; then
    SERVICE_CERT_EXISTS=true
    echo "Certificate found for ${SERVICE_DOMAIN}"
fi

if [ -f "/etc/letsencrypt/live/${GITLAB_DOMAIN}/fullchain.pem" ]; then
    GITLAB_CERT_EXISTS=true
    echo "Certificate found for ${GITLAB_DOMAIN}"
fi

# If certificates don't exist, start in HTTP-only mode
if [ "$HOST_FORWARD_CERT_EXISTS" = false ] || [ "$PORTAL_CERT_EXISTS" = false ] || [ "$SERVICE_CERT_EXISTS" = false ] || [ "$GITLAB_CERT_EXISTS" = false ]; then
    echo "Some certificates not found. Starting nginx in HTTP-only mode for initial certificate generation..."
    
    # Create HTTP-only config for certificate generation
    envsubst '${HOST_FORWARD_DOMAIN} ${PORTAL_DOMAIN} ${SERVICE_DOMAIN} ${GITLAB_DOMAIN}' < /etc/nginx/templates/http-only.conf.template > /etc/nginx/conf.d/default.conf
    
    # Test nginx config
    nginx -t || {
        echo "Nginx config test failed!"
        exit 1
    }
    
    # Start nginx in background
    nginx -g "daemon on;"
    
    # Wait for nginx to start
    sleep 5
    
    # Request certificates for domains that don't have them
    if [ "$HOST_FORWARD_CERT_EXISTS" = false ]; then
        request_certificate ${HOST_FORWARD_DOMAIN}
        if [ -f "/etc/letsencrypt/live/${HOST_FORWARD_DOMAIN}/fullchain.pem" ]; then
            HOST_FORWARD_CERT_EXISTS=true
        fi
    fi
    
    if [ "$PORTAL_CERT_EXISTS" = false ]; then
        request_certificate ${PORTAL_DOMAIN}
        if [ -f "/etc/letsencrypt/live/${PORTAL_DOMAIN}/fullchain.pem" ]; then
            PORTAL_CERT_EXISTS=true
        fi
    fi
    
    if [ "$SERVICE_CERT_EXISTS" = false ]; then
        request_certificate ${SERVICE_DOMAIN}
        if [ -f "/etc/letsencrypt/live/${SERVICE_DOMAIN}/fullchain.pem" ]; then
            SERVICE_CERT_EXISTS=true
        fi
    fi
    
    if [ "$GITLAB_CERT_EXISTS" = false ]; then
        request_certificate ${GITLAB_DOMAIN}
        if [ -f "/etc/letsencrypt/live/${GITLAB_DOMAIN}/fullchain.pem" ]; then
            GITLAB_CERT_EXISTS=true
        fi
    fi
    
    # If certificates were generated, update nginx config
    if [ "$HOST_FORWARD_CERT_EXISTS" = true ] && [ "$PORTAL_CERT_EXISTS" = true ] && [ "$SERVICE_CERT_EXISTS" = true ] && [ "$GITLAB_CERT_EXISTS" = true ]; then
        echo "Updating nginx config with SSL..."
        # Replace with full SSL config
        envsubst '${HOST_FORWARD_DOMAIN} ${PORTAL_DOMAIN} ${SERVICE_DOMAIN} ${GITLAB_DOMAIN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
        
        # Test new config
        nginx -t || {
            echo "SSL nginx config test failed! Keeping HTTP-only mode."
            # Revert to HTTP-only
            envsubst '${HOST_FORWARD_DOMAIN} ${PORTAL_DOMAIN} ${SERVICE_DOMAIN} ${GITLAB_DOMAIN}' < /etc/nginx/templates/http-only.conf.template > /etc/nginx/conf.d/default.conf
        }
        
        # Reload nginx with SSL config
        nginx -s reload
        echo "Nginx reloaded with SSL configuration"
    else
        echo "Not all certificates are available. Continuing with HTTP-only mode..."
        echo "You can manually request certificates later using:"
        echo "  docker-compose exec gateway_nginx certbot certonly --webroot --webroot-path=/var/www/certbot -d ${HOST_FORWARD_DOMAIN}"
        echo "  docker-compose exec gateway_nginx certbot certonly --webroot --webroot-path=/var/www/certbot -d ${PORTAL_DOMAIN}"
        echo "  docker-compose exec gateway_nginx certbot certonly --webroot --webroot-path=/var/www/certbot -d ${SERVICE_DOMAIN}"
        echo "  docker-compose exec gateway_nginx certbot certonly --webroot --webroot-path=/var/www/certbot -d ${GITLAB_DOMAIN}"
    fi
else
    echo "All certificates found. Starting nginx with SSL..."
    # Replace environment variables in nginx config template
    envsubst '${HOST_FORWARD_DOMAIN} ${PORTAL_DOMAIN} ${SERVICE_DOMAIN} ${GITLAB_DOMAIN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
fi

# Start cron for certificate renewal
echo "Setting up certificate renewal cron job..."
echo "0 0 * * * certbot renew --quiet --nginx && nginx -s reload" | crontab -

# Start cron daemon
crond -f -l 2 &

# Keep nginx running in foreground
exec nginx -g "daemon off;"

