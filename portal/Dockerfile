# Stage 1: Build the React application
FROM node:20-alpine3.17 AS builder

WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_SERVICE_DOMAIN=sv.thangtp.id.vn
ARG VITE_API_BASE_URL

# Set environment variables for build
ENV VITE_SERVICE_DOMAIN=${VITE_SERVICE_DOMAIN}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files (excluding files in .dockerignore)
# .env.production will be copied (allowed in .dockerignore)
COPY . .

# Build the application with production mode
# Vite automatically loads .env.production when --mode production is used
# Environment variables prefixed with VITE_* will be available in the app
RUN npm run build -- --mode production

# Stage 2: Serve with nginx
FROM nginx:1.24-alpine3.17

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

