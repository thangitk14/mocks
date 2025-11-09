#!/bin/sh

# Don't exit on error - we want to handle errors gracefully
set +e

# Create directory for ACME challenge
mkdir -p /var/www/certbot

# Check if certificates exist
if [ ! -f "/etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem" ]; then
    echo "Certificate not found. Starting nginx in HTTP-only mode for initial certificate generation..."
    
    # Create HTTP-only config for certificate generation
    envsubst '${DOMAIN_NAME}' < /etc/nginx/templates/http-only.conf.template > /etc/nginx/conf.d/default.conf
    
    # Test nginx config
    nginx -t || {
        echo "Nginx config test failed!"
        exit 1
    }
    
    # Start nginx in background
    nginx -g "daemon on;"
    
    # Wait for nginx to start
    sleep 5
    
    # Request certificate (without force-renewal and try without www first if rate limited)
    echo "Requesting SSL certificate for ${DOMAIN_NAME}..."
    
    # Try to get certificate for both domains
    CERT_SUCCESS=false
    if certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email ${CERTBOT_EMAIL:-admin@${DOMAIN_NAME}} \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        -d ${DOMAIN_NAME} \
        -d www.${DOMAIN_NAME} 2>&1; then
        CERT_SUCCESS=true
        echo "Certificate generated successfully for ${DOMAIN_NAME} and www.${DOMAIN_NAME}"
    else
        echo "Failed to get certificate for both domains. Trying main domain only..."
        # Try main domain only (in case www has rate limit issues)
        if certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email ${CERTBOT_EMAIL:-admin@${DOMAIN_NAME}} \
            --agree-tos \
            --no-eff-email \
            --non-interactive \
            -d ${DOMAIN_NAME} 2>&1; then
            CERT_SUCCESS=true
            echo "Certificate generated successfully for ${DOMAIN_NAME} only"
        else
            echo "Certificate generation failed. Continuing with HTTP-only mode..."
            echo "You can manually request certificate later using:"
            echo "  docker-compose exec host_forward_nginx certbot certonly --webroot --webroot-path=/var/www/certbot -d ${DOMAIN_NAME}"
        fi
    fi
    
    # If certificate was generated, update nginx config
    if [ "$CERT_SUCCESS" = true ] && [ -f "/etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem" ]; then
        echo "Updating nginx config with SSL..."
        # Replace with full SSL config
        envsubst '${DOMAIN_NAME}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
        
        # Test new config
        nginx -t || {
            echo "SSL nginx config test failed! Keeping HTTP-only mode."
            # Revert to HTTP-only
            envsubst '${DOMAIN_NAME}' < /etc/nginx/templates/http-only.conf.template > /etc/nginx/conf.d/default.conf
        }
        
        # Reload nginx with SSL config
        nginx -s reload
        echo "Nginx reloaded with SSL configuration"
    fi
else
    echo "Certificate found. Starting nginx with SSL..."
    # Replace environment variables in nginx config template
    envsubst '${DOMAIN_NAME}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
fi

# Start cron for certificate renewal
echo "Setting up certificate renewal cron job..."
echo "0 0 * * * certbot renew --quiet --nginx && nginx -s reload" | crontab -

# Start cron daemon
crond -f -l 2 &

# Keep nginx running in foreground
exec nginx -g "daemon off;"

