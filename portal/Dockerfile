# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

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
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

