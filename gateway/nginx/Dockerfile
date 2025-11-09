FROM nginx:alpine

# Install certbot and cron
RUN apk add --no-cache certbot certbot-nginx dcron

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY http-only.conf.template /etc/nginx/templates/http-only.conf.template

# Create directories for certificates
RUN mkdir -p /etc/letsencrypt/live /etc/letsencrypt/archive /etc/letsencrypt/renewal

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
