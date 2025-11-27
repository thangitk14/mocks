# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine3.17

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port
EXPOSE 10000

# Set default environment
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]

