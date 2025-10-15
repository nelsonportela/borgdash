# Multi-stage build for BorgDash backend
FROM python:3.11-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-slim

# Install runtime dependencies and Borg
RUN apt-get update && apt-get install -y \
    openssh-client \
    sshpass \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && wget https://github.com/borgbackup/borg/releases/download/1.4.1/borg-linux-glibc228 -O /usr/local/bin/borg \
    && chmod +x /usr/local/bin/borg

# Create non-root user
RUN useradd -m -u 1000 borgdash

# Copy Python packages from builder
COPY --from=builder /root/.local /home/borgdash/.local

# Set working directory
WORKDIR /app

# Copy application code
COPY . /app/

# Create directories
RUN mkdir -p /app/ssh_keys /app/data && \
    chown -R borgdash:borgdash /app

# Switch to non-root user
USER borgdash

# Add local Python packages to PATH
ENV PATH=/home/borgdash/.local/bin:$PATH

# Environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV DATABASE_URL=sqlite:///./data/borgdash.db
ENV SSH_KEY_DIR=/app/ssh_keys
ENV BORG_BINARY=borg

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Start command
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]