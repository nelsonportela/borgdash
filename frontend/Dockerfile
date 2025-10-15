# Multi-stage build for BorgDash frontend
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files first for better caching
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Set build-time environment variables
ARG VITE_API_BASE_URL=http://localhost:8157
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S borgdash -u 1001 -G nodejs

# Change ownership of nginx directories (only what's needed)
RUN chown -R borgdash:nodejs /usr/share/nginx/html && \
    chown -R borgdash:nodejs /var/cache/nginx && \
    mkdir -p /var/log/nginx && \
    chown -R borgdash:nodejs /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown borgdash:nodejs /var/run/nginx.pid

# Switch to non-root user
USER borgdash

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]