# SSL Configuration for Host Forward Service

This directory contains the nginx reverse proxy configuration with SSL/TLS support using Let's Encrypt (Certbot).

## Structure

- `Dockerfile` - Docker image with nginx and certbot
- `nginx.conf` - Main nginx configuration
- `default.conf.template` - Server block template with SSL configuration
- `entrypoint.sh` - Entrypoint script that handles certificate generation
- `setup-ssl.sh` - Script to manually setup SSL certificate
- `renew-ssl.sh` - Script to renew SSL certificate

## Setup

### 1. Environment Variables

Add these environment variables to your `.env` file or `docker-compose.yml`:

```bash
HOST_FORWARD_DOMAIN=your-domain.com
CERTBOT_EMAIL=your-email@example.com
PUBLIC_HOST_FORWARD_HTTP_PORT=80
PUBLIC_HOST_FORWARD_HTTPS_PORT=443
```

### 2. DNS Configuration

Make sure your domain points to your server's IP address:
- `your-domain.com` → Your server IP
- `www.your-domain.com` → Your server IP

### 3. Start Services

```bash
docker-compose up -d
```

The entrypoint script will automatically:
1. Start nginx in HTTP-only mode
2. Request SSL certificate from Let's Encrypt
3. Configure nginx with SSL
4. Set up automatic certificate renewal

### 4. Manual Certificate Setup (Optional)

If automatic setup fails, you can manually request a certificate:

```bash
cd host_forward/nginx
chmod +x setup-ssl.sh
./setup-ssl.sh your-domain.com your-email@example.com
```

## Certificate Renewal

Certificates are automatically renewed via cron job inside the container. The renewal runs daily at midnight.

### Manual Renewal

To manually renew certificates:

```bash
cd host_forward/nginx
chmod +x renew-ssl.sh
./renew-ssl.sh
```

Or using docker-compose:

```bash
docker-compose exec host_forward_nginx certbot renew --nginx
docker-compose exec host_forward_nginx nginx -s reload
```

## Troubleshooting

### Certificate Not Generated

1. Check DNS configuration - domain must point to your server
2. Check firewall - ports 80 and 443 must be open
3. Check logs: `docker-compose logs host_forward_nginx`

### Rate Limit Error (Too Many Failed Authorizations)

If you see an error like "too many failed authorizations (5) for domain in the last 1h0m0s":

1. **Wait for the rate limit to expire** (usually 1 hour)
2. **Try requesting certificate for main domain only** (without www):
   ```bash
   docker-compose exec host_forward_nginx certbot certonly \
       --webroot \
       --webroot-path=/var/www/certbot \
       --email your-email@example.com \
       --agree-tos \
       --no-eff-email \
       -d fw.thangvnnc.io.vn
   ```
3. **Add www subdomain later** after main domain certificate is working
4. The entrypoint script will automatically try main domain only if both domains fail

### Certificate Renewal Fails

1. Check if domain still points to your server
2. Check if ports 80 and 443 are accessible
3. Manually renew: `docker-compose exec host_forward_nginx certbot renew --force-renewal`

### Nginx Not Starting

1. Check nginx config: `docker-compose exec host_forward_nginx nginx -t`
2. Check logs: `docker-compose logs host_forward_nginx`
3. Verify certificate paths exist

## Notes

- Certificates are stored in Docker volume `certbot_data`
- ACME challenge files are stored in Docker volume `certbot_www`
- The nginx container automatically handles HTTP to HTTPS redirect
- SSL configuration follows security best practices (TLS 1.2+, strong ciphers, HSTS)

