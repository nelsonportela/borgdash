# Multi-stage build for BorgDash combined container
# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy frontend files
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend with Frontend
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openssh-client \
    sshpass \
    curl \
    wget \
    borgbackup \
    && rm -rf /var/lib/apt/lists/*

# Create user
RUN useradd -m -u 1000 borgdash

# Copy backend requirements and install
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY backend/app ./app
COPY backend/migrate_db.py .

# Copy frontend build from previous stage
COPY --from=frontend-builder /app/dist ./frontend/dist

# Create necessary directories
RUN mkdir -p /app/data /app/ssh_keys /app/host_keys \
    && chown -R borgdash:borgdash /app

# Switch to non-root user
USER borgdash

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run database migration and start application
CMD ["sh", "-c", "python migrate_db.py && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"]