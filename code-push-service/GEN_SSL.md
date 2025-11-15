### https://www.programonaut.com/setup-ssl-with-docker-nginx-and-lets-encrypt/

### 1. Create file nginx/nginx.conf
Create/rename file nginx_before_gen_ssl.conf to nginx/nginx.conf

Add docker-compose.yml
```
nginx:
    container_name: nginx
    restart: unless-stopped
    image: nginx
    ports:
        - 80:80
        - 443:443
    volumes:
        - ./nginx/nginx.conf:/etc/nginx/nginx.conf
```
Start docker running 
```
docker compose up -d
```
Update file nginx/nginx.conf add location:
```
    server {
        listen 80 default_server;

        .
        .
        .
  
        location ~ /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
    }
```
Update composer add cerbot:
Add 2 line to bottom volumes
```
- ./certbot/conf:/etc/letsencrypt
- ./certbot/www:/var/www/certbot
```
After add:
```
nginx:
    container_name: nginx
    restart: unless-stopped
    image: nginx
    ports:
        - 80:80
        - 443:443
    volumes:
        - ./nginx/nginx.conf:/etc/nginx/nginx.conf
        - ./certbot/conf:/etc/letsencrypt
        - ./certbot/www:/var/www/certbot
```

### 2. Run cerbot gen file key
Add certbot update domain, email:
```
certbot:
  image: certbot/certbot
  container_name: certbot
  volumes: 
    - ./certbot/conf:/etc/letsencrypt
    - ./certbot/www:/var/www/certbot
  command: certonly --webroot -w /var/www/certbot --force-renewal --email {email} -d {domain} --agree-tos
```
Run gen file cer
```
docker-compose up -d certbot
```
Update file ngix/ngix.conf (domain and proxy_pass)
```
http {
    server_tokens off;
    charset utf-8;

    # always redirect to https
    server {
        listen 80 default_server;

        server_name _;

        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        # use the certificates
        ssl_certificate     /etc/letsencrypt/live/{domain}/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/{domain}/privkey.pem;
        server_name {domain};
        root /var/www/html;
        index index.php index.html index.htm;


        location / {
            proxy_pass http://helloworld:8000/;
        }

        location ~ /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
    }
}
```
Run 
```
docker-compose up -d
```

### 3. Automated renewal with crontab
```
crontab -e
```
And adding a line with the following structure:
```
0 5 1 */2 *  /usr/bin/docker compose -f /var/docker/docker-compose.yml up certbot
```